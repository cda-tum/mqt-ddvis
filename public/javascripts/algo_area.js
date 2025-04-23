// Copyright (c) 2023 - 2025 Chair for Design Automation, TUM
// Copyright (c) 2025 Munich Quantum Software Company GmbH
// All rights reserved.
//
// SPDX-License-Identifier: MIT
//
// Licensed under the MIT License

const FORMAT_UNKNOWN = 0;
const QASM_FORMAT = 1;

const paddingLeftOffset = 15; //10px is the padding of lineNumbers, so q_algo also needs at least this much padding
const paddingLeftPerDigit = 10; //padding of q_algo based on the number of digits the line-numbering needs

/**Calculates how many digits the given number has. Only works for unsigned integers!
 *
 * @param num {number} the number we want to check
 * @returns {number} number of digits the given number has
 */
function _numOfDigits(num) {
  return String(num).length;
}

/**Creates html-elements in a given div and handles lineNumbering, highlighting, loading and editing of a quantum
 * algorithm.
 *
 */
class AlgoArea {
  /**
   *
   * @param div {div} here the html-components of the algoArea will be inserted
   * @param idPrefix {string} must be unique among all algoAreas
   * @param changeState {function} allows the algoArea to change the state of its surroundings during simulation
   * @param print {function} for printing/rendering a DD in the .dot format
   * @param error {function} to notify the user as soon as an error occurred
   * @param resetAlgoCallback {function} called when the algorithm is reset (e.g. user deletes everything)
   * @param onLoadError {function} called when loading the algorithm failed but not due to invalid syntax
   * @param loadParams {object} needs to be sent on /load, in addition to the standard-parameters
   *              empty for simulation, { algo1: true/false } for verification
   */
  constructor(
    div,
    idPrefix,
    changeState,
    print,
    error,
    resetAlgoCallback,
    onLoadError,
    loadParams = {},
  ) {
    this._idPrefix = idPrefix;

    this._drop_zone = $(
      '<div id="' +
        idPrefix +
        '_drop_zone" ' +
        'ondrop="dropHandler(event)" ondragover="dragOverHandler(event)" ' + //somehow in the case of these global functions, they need to be set in this way
        'class="drop_zone"></div>',
    );
    registerDropListener(idPrefix, this);

    this._line_numbers = $(
      '<div id="' +
        idPrefix +
        '_line_numbers" class="line_numbers">' +
        "</div>",
    );

    this._backdrop = $(
      '<div id="' + idPrefix + '_backdrop" class="backdrop">' + "</div>",
    );

    this._highlighting = $(
      '<div id="' + idPrefix + '_highlighting" class="highlights"></div>',
    );

    this._q_algo = $(
      '<textarea id="' +
        idPrefix +
        '_q_algo" type="text" class="q_algo"' +
        ' placeholder="Enter algorithm or drop .qasm-/.real-file here."' +
        ' autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
        "</textarea>",
    );
    this._q_algo.on({
      focusout: () => this.loadAlgorithm(),
      input: () => this._handleInput(),
      scroll: () => this._handleScroll(),
    });

    this._inv_algo_warning = $(
      '<div id="' +
        idPrefix +
        '_inv_algo_warning" class="inv_algo_warning"></div>',
    );

    div.append(this._drop_zone);
    this._drop_zone.append(this._line_numbers);
    this._drop_zone.append(this._backdrop);
    this._drop_zone.append(this._q_algo);
    this._drop_zone.append(this._inv_algo_warning);

    this._backdrop.append(this._highlighting);

    this._hlManager = new HighlightManager(this._highlighting, this); //manages the highlighting process
    this._changeState = changeState; //function to change the state on the callers side      //todo do the same ST_values work for verification?
    this._print = print; //function to print the DD on the callers side
    this._error = error; //function on the callers side for handling errors
    this._resetAlgoCallback = resetAlgoCallback; //function on the callers side for additional stuff when
    // resetting the algorithm
    this._onLoadError = onLoadError; //allows handling of non-syntax errors when loading an algorithm
    this._loadParams = loadParams; //object that needs to be sent to the server on calling /load
    // { } for simulation, { algo1: true/false } for verification

    this._algoFormat = FORMAT_UNKNOWN; //determines the format in which the algorithm is written to detect operations
    this._emptyAlgo = true; //flag to avoid loading that would obviously lead to an error
    this._algoChanged = false; //flag to avoid useless loading of the algorithm
    this._numOfOperations = 0; //how many operations the current algorithm has, needed for example to determine
    // if we reached the end of the algorithm
    this._oldAlgo = ""; //the old input (maybe not valid, but needed if the user edit lines they are not allowed to change)
    this._lastCursorPos = 0; //last position of the mouse cursor in the textArea, changes when the user edits
  }

  /**Returns the current algorithm. In case of valid algorithms the returned string is currently loaded.
   *
   * @returns {jQuery|string|undefined} current algorithm in the textArea
   */
  get algo() {
    return this._q_algo.val();
  }

  set algo(algo) {
    this._q_algo.val(algo);
    //this._hlManager.text = algo;  //unnecessary since in all cases we either load immediately afterwards (example algos)
    // or don't want the algorithm to be loaded (empty algos)
  }

  get hlManager() {
    return this._hlManager;
  }

  get numOfOperations() {
    return this._numOfOperations;
  }

  get algoFormat() {
    return this._algoFormat;
  }

  set algoFormat(f) {
    //check for validity
    if (f === QASM_FORMAT || f === FORMAT_UNKNOWN) this._algoFormat = f;
    else {
      this._algoFormat = FORMAT_UNKNOWN;
      console.log(
        "Tried to set algoFormat to " +
          f +
          ", which is an illegal value. Was set to FORMAT_UNKNOWN (0) instead.",
      );
    }
  }

  get emptyAlgo() {
    return this._emptyAlgo;
  }

  set emptyAlgo(flag) {
    this._emptyAlgo = !!flag; //!! forces parsing to bool
  }

  set algoChanged(flag) {
    this._algoChanged = !!flag; //!! forces parsing to bool
  }

  isFullyHighlighted() {
    return this._hlManager.highlightedLines >= this._numOfOperations;
  }

  /**Loads the algorithm placed inside the textArea #q_algo
   *
   * @param format {number} the format in which the algorithm is written; the only occasion where this parameter is
   *        not set is when leaving the textArea after editing, but in this case the format didn't change so the old
   *        algoFormat is used
   * @param reset {boolean} whether a new simulation needs to be started after loading; default false because again
   *        the only occasion it is not set is after editing, but there we especially don't want to reset
   */
  loadAlgorithm(format = this._algoFormat, reset = false) {
    if (this._emptyAlgo || !this._algoChanged) return;

    startLoadingAnimation();

    let algo = this._q_algo.val(); //usually q_algo.val() is taken
    const opNum = reset
      ? 0 //start again at the beginning if we want to reset
      : this._hlManager.highlightedLines; //we want to continue simulating after the last processed line, which
    // is after the highlighted ones

    //find out of in which format the input text is if we don't know it yet
    if (format === FORMAT_UNKNOWN) format = this.findFormat(algo);
    this.algoFormat = format;

    if (this._algoFormat === FORMAT_UNKNOWN) {
      //if the format is still unknown, we can't load the algorithm -> abort
      const errMsg =
        "Format of your algorithm wasn't recognized. Please make sure it is either Real or QASM and try again.";
      this._error(errMsg);
      this._showInvalidAlgoWarning(errMsg);
      this._changeState(STATE_NOTHING_LOADED);
      endLoadingAnimation();
      return;
    }

    if (algo) {
      const temp = this.preformatAlgorithm(algo, format);
      this._algoChanged = false;

      this._loadParams.basisStates = null; //not needed at the moment, but since I started implementing it, I
      // didn't delete it
      this._loadParams.algo = algo + "\n"; //append \n because it doesn't matter semantically, but the parser
      // needs an empty line at the end and for better error message we
      // can't send the pre-formatted algorithm (which would have added
      // \n if it was missing)
      this._loadParams.opNum = opNum;
      this._loadParams.format = format;
      this._loadParams.reset = reset;
      this._loadParams.dataKey = dataKey;

      const call = $.post("load", this._loadParams);
      call.done((res) => {
        algo = temp.algo;
        if (temp.set) {
          this._q_algo.val(algo);
          //also set the highlights because the lines might have changed
          this._hlManager.text = algo;
          this._hlManager._updateDiv();
          // this._updateHeights();
        }

        this._oldAlgo = algo; //update this value so we can properly edit the algorithm

        //update highlighting to the current algorithm
        if (reset) {
          this._hlManager.resetHighlighting(this._q_algo.val());
          this._hlManager.setHighlights();
        } else this._hlManager.text = this._q_algo.val();

        this._numOfOperations = res.data.numOfOperations; //save how many operations the new algorithm has
        this._setLineNumbers(); //set the line numbers because we have a new algorithm
        this._print(
          res,
          () => {
            if (this._numOfOperations === 0)
              this._changeState(STATE_LOADED_EMPTY);
            else {
              if (opNum <= 0) this._changeState(STATE_LOADED_START);
              else if (opNum >= this._numOfOperations)
                this._changeState(STATE_LOADED_END);
              else this._changeState(STATE_LOADED);

              if (res.data.noGoingBack)
                document.getElementById("prev").disabled = true;
              if (res.data.nextIsIrreversible) {
                document.getElementById("toEnd").disabled = true;
              }
            }

            this._hideInvalidAlgoWarning(); //a valid algorithm was loaded -> hide the warning
            endLoadingAnimation(); //I think this is no longer needed because Lukas added it to the callback?
          },
          true,
        ); //print the DD of the new algorithm
      });
      call.fail((res) => {
        if (reset) {
          this._hlManager.resetHighlighting("");
          this._hlManager.setHighlights();
        }

        this._changeState(STATE_NOTHING_LOADED); //since an error occurred on loading, nothing is loaded now
        endLoadingAnimation();

        if (res.status === 404) window.location.reload(false);
        //404 means that we are no longer registered and therefore need to reload
        else if (res.status === 500) {
          if (res.responseJSON && res.responseJSON.msg)
            this._error(res.responseJSON.msg);
          else this._error("Internal Server Error");
        } else {
          //this should be invalid-algorithm-error
          const msg = res.responseJSON.msg;
          if (msg.startsWith("Invalid algorithm!")) {
            //an invalid algorithm was loaded
            this._setLineNumbers();
            const errMsg = this._parseErrorMessage(res);
            this._showInvalidAlgoWarning(errMsg);
            this._error(errMsg);
          } else {
            //another invalidity, for example non-matching number of qubits for verification
            this._setLineNumbers(); //although they're not necessary, it may look weird if we don't set them
            if (this._onLoadError) this._onLoadError(msg);
            else this._error(msg); //default case, so simulation doesn't need to provide a function
            // (though for simulation it shouldn't be possible to reach this code)
          }
        }
      });
    }
  }

  /**Shows a warning symbol in the algoArea for invalid algorithms and the cause as tooltip.
   *
   * @param msg {string} for showing the error that caused invalidity as a tooltip of the warning
   * @private
   */
  _showInvalidAlgoWarning(msg = "Invalid Algorithm!") {
    this._inv_algo_warning.css("display", "block");
    this._inv_algo_warning.prop("title", msg);
  }

  /**Hides the warning symbol after the error has been fixed and a valid algorithm was loaded.
   *
   * @private
   */
  _hideInvalidAlgoWarning() {
    this._inv_algo_warning.css("display", "none");
  }

  /**Removes the position of the error that is stated in the server-backend because the client has a special line
   * numbering (only operations are numbered). Additionally based on the original position, the position inside the
   * algoArea is calculated and added to the error message.
   *
   * @param res response of a server-call
   * @returns {string} the error message from the backend with the correct position
   * @private
   */
  _parseErrorMessage(res) {
    let errMsg = "Invalid algorithm at ";
    if (res.responseJSON && res.responseJSON.msg) {
      const parserError = res.responseJSON.msg;

      // Extract filename, line, column, and message from the error string
      const errorParts = parserError.split(/:\s*/);
      const lineMsg = parseInt(errorParts[1]);
      const column = parseInt(errorParts[2]);
      const msg = errorParts[3];

      // Get the line number displayed in the line numbering
      const temp = this._line_numbers.html().split("\n");
      let lineNumber;
      if (temp.length < lineMsg || lineMsg <= 0) lineNumber = lineMsg;
      else {
        lineNumber = parseInt(temp[lineMsg - 1]);
        if (!lineNumber) lineNumber = lineMsg;
      }

      // Construct the error message
      errMsg += "line " + lineNumber + ", column " + column + "\n" + msg;
    }

    return errMsg;
  }

  /**Resets algoArea by removing its algorithm.
   *
   * @param applyCallback {boolean} whether the given resetAlgoCallback should be called or not
   */
  resetAlgorithm(applyCallback = true) {
    this._emptyAlgo = true;
    this.algoFormat = FORMAT_UNKNOWN;

    this._hlManager.resetHighlighting("");
    this._line_numbers.html(""); //remove line numbers
    this._q_algo.val("");
    this._setQAlgoMarginLeft(); //reset margin-left to the initial/default value

    this._hideInvalidAlgoWarning(); //an empty algorithm can no longer have any errors, so we hide the warning

    if (applyCallback) this._resetAlgoCallback(); //allows the caller to do stuff when the algorithm is reset
  }

  /**Dynamically changes sizes of the html-elements depending on the line numbers and scrollbars.
   *
   */
  updateSizes() {
    const dzInnerWidth = this._drop_zone.innerWidth();
    const marginLeft = parseFloat(this._q_algo.css("padding-left")); //value is depended on lineNumbering
    // const width = dzInnerWidth - marginLeft;
    // this._q_algo.css('width', width);

    // this._updateHeights();
  }

  /**Convenience function that updates the heights of line_numbers and highlighting because only q_algo can have a
   * horizontal scrollbar.
   *
   * @private
   */
  _updateHeights() {
    const clientHeight = document.getElementById(
      this._idPrefix + "_q_algo",
    ).clientHeight;
    //set the height of line_numbers to the height of q_algo without scrollbar, so no offset can occur
    // this._line_numbers.css('height', clientHeight);
    // this._highlighting.css('height', clientHeight);
  }

  /**Sets the line numbering based on the current algorithm.
   *
   * @private
   */
  _setLineNumbers() {
    const lines = this._q_algo.val().split("\n");
    const digits = _numOfDigits(
      this._numOfOperations > 0 ? this._numOfOperations : lines.length,
    );

    let num = 0;
    let insideGateDef = false;
    for (let i = 0; i < lines.length; i++) {
      if (i <= this._hlManager.offset) lines[i] = "";
      else {
        if (lines[i].includes("{")) insideGateDef = true;
        if (insideGateDef) {
          if (lines[i].includes("}")) insideGateDef = false;
          lines[i] = ""; //no line numbering in gate definitions
        } else {
          if (this.isOperation(lines[i], this._algoFormat)) {
            num++;
            const numDigits = _numOfDigits(num);

            //append some space if needed so the digits align
            let space = "";
            for (let j = 0; j < digits - numDigits; j++) space += "  ";
            lines[i] = space + num.toString();
          } else lines[i] = "";
        }
      }
    }

    let text = "";
    lines.forEach((l) => (text += l + "\n"));
    this._line_numbers.html(text);
    this._setQAlgoMarginLeft(digits); //update the margin because it is depended on the number of digits
  }

  /**Sets the margin-left of q_algo so the line numbers don't overlap with the algorithm.
   *
   * @param digits {number} determines how much margin we need so the line numbering doesn't overlap with the
   *                        algorithm
   * @private
   */
  _setQAlgoMarginLeft(digits = 1) {
    if (digits < 1) digits = 1; //set at least the default margin
    const margin = paddingLeftOffset + paddingLeftPerDigit * digits;
    this._q_algo.css("padding-left", margin); //need to set margin because padding is ignored when scrolling
    //(at least in some browsers)
    // const width = this._drop_zone.innerWidth() - margin;
    // this._q_algo.css('width', width);
  }

  /**Loads the algorithm inside the dropped file if it is either .qasm or .real.
   *
   * @param event the drop-event that contains the dropped file
   */
  handleDrop(event) {
    if (event.dataTransfer.items) {
      //check if a file was transmitted/dropped
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        //determine which format to load or show an error
        let format = FORMAT_UNKNOWN;
        if (event.dataTransfer.files[i].name.endsWith(".qasm"))
          format = QASM_FORMAT;
        else {
          this._error("Filetype not supported!");
          return;
        }

        const file = event.dataTransfer.files[i];
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target.result.trim().length > 0) {
            //the file has content
            this._q_algo.val(e.target.result);
            this._algoChanged = true;
            this._emptyAlgo = false;
            this.loadAlgorithm(format, true); //since a completely new algorithm has been uploaded
            // we have to throw away the old simulation data
          } else {
            this.resetAlgorithm(); //empty file does the same as deleting the content of q_algo
            this._error("You've uploaded an empty file!"); //notify the user
          }
        };
        reader.readAsBinaryString(file);
      }
    }
  }

  /**Decides whether an edit the user made to the algorithm while it is loaded was allowed or illegal. An illegal edit
   * would be a change in a line with an operation that has already been processed. Also changing the header while
   * not being at the start of the simulation is illegal.
   * For Firefox a special case must be considered, since we can't disable the algoArea for optical reasons: during
   * a simulation step or the diashow (in these cases other browsers disable algoArea so it's not even possible)
   * editing anything inside q_algo is illegal.
   *
   * @private
   */
  _handleInput() {
    if (isFirefox && runDia) {
      //TODO what needs to be done for verification? can runDia be true but verification is active?
      this._error(
        "You are not allowed to edit the algorithm during the diashow or simulation-process!",
      );
      this._q_algo.val(this._oldAlgo);
      return;
    }

    //todo maybe could be implemented more efficiently if only the lines with the cursor are considered?
    //save the current position of the cursor so we can mark the illegal change the user might have made
    this._lastCursorPos = this._q_algo.prop("selectionStart");

    //console.log("Lines with Cursor are: ");
    //console.log(this._debugGetLinesWithCursor());
    //console.log("__________________________________");

    const newAlgo = this._q_algo.val();
    //we need to find out the format if possible
    if (this._algoFormat === FORMAT_UNKNOWN)
      this._algoFormat = this.findFormat(newAlgo);

    if (newAlgo.trim().length === 0) {
      //user deleted everything, so we reset
      this.resetAlgorithm();
      return;
    }

    this._emptyAlgo = false; //since the length of newAlgo is > 0, we definitely have no empty algorithm
    this._algoChanged = true; //the user edited something, so the algorithm changed and we need to reload it later
    const curLines = newAlgo.split("\n");
    const oldLines = this._oldAlgo.split("\n");
    //if nothing is highlighted yet, the user may edit anything and we don't have to check
    if (this._hlManager.highlightedLines > 0) {
      //check if a highlighted line changed, if yes abort the changes
      const lastLineWithHighlighting =
        this._hlManager.highlightedLines + this._hlManager.nopsInHighlighting;

      /*
            //header can be adapted, but lines can't be deleted (this would make a complete update of the highlighting necessary)
            for(let i = hlManager.offset; i <= lastLineWithHighlighting; i++) {
                //non-highlighted lines may change, because they are no operations
                if(hlManager.isHighlighted(i) && curLines[i] !== oldLines[i]) {   //illegal change!
                    q_algo.val(oldAlgo);   //reset algorithm to old input
                    showError("You are not allowed to change already processed lines!");
                    return;
                }
            }
            */

      //the header is not allowed to change as well as all processed lines
      for (let i = 0; i < lastLineWithHighlighting; i++) {
        //non-highlighted lines may change, because they are no operations
        if (
          (i < this._hlManager.offset || this._hlManager.isHighlighted(i)) && //the header and highlighted lines are not allowed to change (but comments are)
          curLines[i] !== oldLines[i]
        ) {
          //illegal change!
          this._q_algo.val(this._oldAlgo); //reset algorithm to old input
          this._selectLineWithCursor();
          this._error("You are not allowed to change already processed lines!");
          return;
        } else if (!this._hlManager.isHighlighted(i)) {
          //you are not allowed to change a line with a comment to something else than a different comment!
          if (
            AlgoArea.isComment(oldLines[i], this._algoFormat) &&
            !AlgoArea.isComment(curLines[i], this._algoFormat)
          ) {
            this._q_algo.val(this._oldAlgo); //reset algorithm to old input
            this._selectLineWithCursor();
            this._error(
              "You are not allowed to change a comment to an operation that should already have been processed!",
            );
            return;
          }
        }
      }
    }

    //add pending lines if lines have been added by the user so the highlighting doesn't get wrong while scrolling
    const lineDif = curLines.length - oldLines.length;
    if (lineDif > 0) {
      //let text = "";
      for (let i = 0; i < lineDif; i++) {
        this._hlManager.addPendingLine();
        //text += "\n";
      }
      this._hlManager._updateDiv();
    } else {
      //remove pending lines if lines have been removed by the user so the scrollbar doesn't look weird
      for (let i = 0; i < -lineDif; i++) {
        this._hlManager.removePendingLine();
      }
      this._hlManager._updateDiv();
    }

    this._oldAlgo = this._q_algo.val(); //changes are legal so they are "saved"
    this._setLineNumbers();
    // this._updateHeights();  //call here because the vertical scrollbar might have changed
  }

  /**Selects the line in q_algo where the cursor was before the focus left q_algo (saved in lastCursorPos).
   *
   * @private
   */
  _selectLineWithCursor() {
    const algo = this._q_algo.val();
    //determine start and end of the line
    let lineStart = algo.lastIndexOf("\n", this._lastCursorPos) + 1; //+1 because we need the index of the first character in the line
    let lineEnd;
    //special case where lastCursorPos is directly at the end of a line
    if (lineStart === this._lastCursorPos) {
      lineStart = algo.lastIndexOf("\n", this._lastCursorPos - 2) + 1; //lastCursorPos-1 would be the current lineStart, but we need one character before that
      lineEnd = this._lastCursorPos - 1; //the position right before \n
    } else lineEnd = algo.indexOf("\n", lineStart);

    //select the line
    this._q_algo.prop("selectionStart", lineStart);
    this._q_algo.prop("selectionEnd", lineEnd);
  }

  /**Scrolls line_numbers and highlighting to the current scroll position of q_algo since the line numbers and the
   * highlighted lines need to automatically adapt to the algorithm-text.
   *
   * @private
   */
  _handleScroll() {
    //event is ignored in firefox if source (this._q_algo) is disabled
    const scrollTop = this._q_algo.scrollTop();

    this._line_numbers.scrollTop(scrollTop);
    this._highlighting.scrollTop(scrollTop);
  }

  /**Finds out the format of the given algorithm. Either Qasm or Real.
   *
   * @param algo {string} the algorithm we want to check
   * @returns {number} a code that represents one of the supported formats
   */
  findFormat(algo) {
    return QASM_FORMAT;
  }

  /**Checks if the given QASM- or Real-line is an operation.
   *
   * @param line {string} one line of an algorithm
   * @param format {number} format of the line we check
   * @returns {boolean} whether the line is an operation in the given format or not
   */
  isOperation(line, format = this._algoFormat) {
    if (line) {
      if (format === QASM_FORMAT) {
        return !(
          line.trim() === "" ||
          line.includes("OPENQASM") ||
          line.includes("include") ||
          line.includes("qreg") ||
          line.includes("creg") ||
          //line.includes("{") ||
          //line.endsWith("}") ||
          line.includes("gate") ||
          AlgoArea.isComment(line, format)
        );
      } else if (format === FORMAT_UNKNOWN) {
        console.log("Format unknown. Line: " + line);
        return false;
      } else {
        console.log("Format (" + format + ") not recognized");
        return false;
      }
    } else return false;
  }

  /**Preformats the given algorithm so it can be loaded and on success highlighted correctly. Preformatting includes
   * adding a new line at the end of the algorithm (parser at server side needs this), making sure that every
   * line contains at most one operation, collapse new lines if an operation is spread across multiple lines.
   *
   * @param algo {string} the algorithm we want to format
   * @param format {number} the format of the algorithm
   * @returns {{set: boolean, algo: string}}  set: whether the content of q_algo needs to be updated or not
   *                                          algo: the correctly formatted version of the algorithm
   */
  preformatAlgorithm(algo, format) {
    let setQAlgo = false; //whether the content of q_algo should be updated or not

    //make sure every operation is in a separate line
    if (format === QASM_FORMAT) {
      let temp = "";
      const lines = algo.split("\n");

      let insideGateDef = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes("{")) insideGateDef = true;
        if (insideGateDef) {
          const index = line.indexOf("}");
          if (index > -1) {
            insideGateDef = false;
            temp += line.substring(0, index + 1); //include "}"
            //check if there are characters left in this line
            if (index + 1 < line.length)
              temp += "\n" + line.substring(index + 1);

            //don't create a new line for the last line, because the way splitting works there was no \n at the end of the last line
            if (i < lines.length - 1) temp += "\n";
          } else {
            temp += line;
            //don't create a new line for the last line, because the way splitting works there was no \n at the end of the last line
            if (i < lines.length - 1) temp += "\n";
          }
        } else {
          //"\n" needs to be added separately because it was removed while splitting
          if (this.isOperation(line, format)) {
            if (i >= lines.length - 1) {
              //if the last line is an operation, the needed \n is added here and not at the end of the preformatting
              // so we need to add the pending line here
              this._hlManager.addPendingLine();
              this._hlManager._updateDiv();
            }

            let l = line;
            while (l.length !== 0) {
              let index = l.indexOf(";");
              if (index === -1) {
                //no semicolon found
                if (AlgoArea.containsComment(l, format)) {
                  //don't search for the missing ; because there is definitely a comment in between
                  temp += line + "\n";
                  l = ""; //make sure to leave the outer loop and continue with the outer-outer-loop
                  break;
                }

                //search for the missing ; in the following lines
                temp += l;
                i++;
                while (i < lines.length) {
                  l = lines[i];
                  if (AlgoArea.isComment(l, format)) {
                    temp += "\n"; //don't collapse the operation-line with the comment-line
                    index = -1; //a bit hacky, but needed so I don't have to copy code in a strange way
                    //what happens: since we immediately jump to the outer loop op will be empty and l will stay the same
                    // this makes sure that the whole comment (in the if afterwards we know that the first branch must be
                    // entered since l was a comment and didn't change) will be like it initially was
                    break;
                  }
                  index = l.indexOf(";");
                  if (index === -1) temp += l;
                  else break; //if we found a semicolon we can continue in the normal (outer) loop
                  i++;
                }

                if (index === -1) {
                  //we are in the last line and no ; was found
                  temp += "\n";
                  break;
                }
              }

              const op = l.substring(0, index + 1); //we need to include the semicolon, so it is index+1
              l = l.substring(index + 1);

              //special case for comments in the same line as an operation
              if (AlgoArea.isComment(l, format)) {
                temp += op + l + "\n"; //the comment is allowed to stay in the same line
                break;
              } else temp += op + "\n"; //insert the operation with the added newLine
              l = l.trim();
            }
          } else {
            temp += line;
            //don't create a new line for the last line, because the way splitting works there was no \n at the end of the last line
            if (i < lines.length - 1) temp += "\n";
          }
        }
      }
      algo = temp;
      setQAlgo = true;
    }
    //for REAL_FORMAT this is inherently the case, because \n is used to separate operations

    //append an empty line at the end if there is none yet
    if (!algo.endsWith("\n")) {
      algo = algo + "\n";
      setQAlgo = true;
      this._hlManager.addPendingLine();
      this._hlManager._updateDiv();
    }

    return {
      algo: algo,
      set: setQAlgo,
    };
  }

  /**Checks for a algorithm-line and a format if said line is a comment.
   *
   * @param line {string} a line of an algorithm of which we want to know whether it is a comment or not
   * @param format {number} a code representing the format of the algorithm the line is part of
   * @returns {boolean} whether the given line is a comment in the given format or not
   */
  static isComment(line, format) {
    if (format === QASM_FORMAT) return line.trim().startsWith("//");
    else if (format === FORMAT_UNKNOWN) {
      console.log("Format unknown. Line: " + line);
      return true;
    } else {
      console.log("Format not recognized");
      return true;
    }
  }

  /**Checks for an algorithm-line and a format if said line contains a comment.
   * Needed for preformatting so we don't search a comment for a missing semicolon.
   *
   * @param line {string} a line of an algorithm of which we want to know whether it contains a comment or not
   * @param format {number} a code representing the format of the algorithm the line is part of
   * @returns {boolean} whether the given line contains a comment in the given format or not
   */
  static containsComment(line, format) {
    if (format === QASM_FORMAT) return line.includes("//");
    else {
      console.log("Format not recognized");
      return true;
    }
  }
}
