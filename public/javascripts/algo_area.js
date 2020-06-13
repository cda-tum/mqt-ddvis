
const FORMAT_UNKNOWN = 0;
const QASM_FORMAT = 1;
const REAL_FORMAT = 2;

const paddingLeftOffset = 15;   //10px is the padding of lineNumbers, so q_algo also needs at least this much padding
const paddingLeftPerDigit = 10; //padding of q_algo based on the number of digits the line-numbering needs

/*
Only works for integers!
 */
function numOfDigits(num) {
    return String(num).length;
}

class AlgoArea {

    /**
     *
     * @param div
     * @param idPrefix must be unique among all algoAreas
     * @param changeState
     * @param print
     * @param error
     */
    constructor(div, idPrefix, changeState, print, error) {
        this._idPrefix = idPrefix;

        this._drop_zone = $(
            '<div id="' + idPrefix + '_drop_zone" ' +
            'ondrop="dropHandler(event)" ondragover="dragOverHandler(event)" ' +  //somehow in the case of these global functions, they need to be set in this way
            'class="drop_zone"></div>'
        );
        registerDropListener(idPrefix, this);

        this._line_numbers = $(
            '<div id="' + idPrefix + '_line_numbers" class="line_numbers">' +
            '</div>'
        );

        this._backdrop = $(
            '<div id="' + idPrefix + '_backdrop" class="backdrop">' +
            '</div>'
        );

        this._highlighting = $(
            '<div id="' + idPrefix + '_highlighting" class="highlights"></div>'
        );

        this._q_algo = $(
            '<textarea id="' + idPrefix + '_q_algo" type="text" class="q_algo"' +
            ' placeholder="Enter algorithm or drop .qasm-/.real-file here."' +
            ' autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
            '</textarea>'
        );
        this._q_algo.on({
            'focusout': () => this.loadAlgorithm(),
            'input': () => this._handleInput(),
            'scroll': () => this._handleScroll()
        });

        this._inv_algo_warning = $(
          '<div id="' + idPrefix + '_inv_algo_warning" class="inv_algo_warning"></div>'
        );

        div.append(this._drop_zone);
        this._drop_zone.append(this._line_numbers);
        this._drop_zone.append(this._backdrop);
        this._drop_zone.append(this._q_algo);
        this._drop_zone.append(this._inv_algo_warning);

        this._backdrop.append(this._highlighting);

        this._hlManager = new HighlightManager(this._highlighting, this);
        this._changeState = changeState; //function to change the state on the callers side
        this._print = print; //function to print the DD on the callers side
        this._error = error; //function on the callers side for handling errors

        this._algoFormat = FORMAT_UNKNOWN;
        this._emptyAlgo = true;
        this._algoChanged = false;
        this._numOfOperations = 0;
        this._oldAlgo = "";           //the old input (maybe not valid, but needed if the user edit lines they are not allowed to change)
        this._lastCursorPos = 0;
    }

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
        if(f === QASM_FORMAT || f === REAL_FORMAT || f === FORMAT_UNKNOWN) this._algoFormat = f;
        else {
            this._algoFormat = FORMAT_UNKNOWN;
            console.log("Tried to set algoFormat to " + f + ", which is an illegal value. Was set to FORMAT_UNKNOWN (0) instead.");
        }
    }

    get emptyAlgo() {
        return this._emptyAlgo;
    }

    set emptyAlgo(flag) {
        this._emptyAlgo = !!flag;   //!! forces parsing to bool
    }

    set algoChanged(flag) {
        this._algoChanged = !!flag;   //!! forces parsing to bool
    }

    isFullyHighlighted() {
        return this._hlManager.highlightedLines >= this._numOfOperations;
    }

    /**Loads the algorithm placed inside the textArea #q_algo
     *
     * @param format the format in which the algorithm is written; the only occasion where this parameter is not set
     *        is when leaving the textArea after editing, but in this case the format didn't change so the old algoFormat is used
     * @param reset whether a new simulation needs to be started after loading; default false because again the only occasion
     *        it is not set is after editing, but there we especially don't want to reset
     */
    loadAlgorithm(format = this._algoFormat, reset = false) {
        if(this._emptyAlgo || !this._algoChanged) return;

        startLoadingAnimation();

        let algo = this._q_algo.val();   //usually q_algo.val() is taken
        const opNum = reset ?
            0 : //parseInt(line_to_go.val()) :
            this._hlManager.highlightedLines;   //we want to continue simulating after the last processed line, which is after the highlighted ones

        //find out of in which format the input text is if we don't know it yet
        if(format === FORMAT_UNKNOWN) format = this.findFormat(algo);
        this.algoFormat = format;

        if(this._algoFormat === FORMAT_UNKNOWN) {
            //if the format is still unknown, we can't load the algorithm -> abort
            const errMsg = "Format of your algorithm wasn't recognized. Please make sure it is either Real or QASM and try again.";
            this._error(errMsg);
            this._showInvalidAlgoWarning(errMsg);
            changeState(STATE_NOTHING_LOADED);
            endLoadingAnimation();
        }

        if(algo) {
            const temp = this.preformatAlgorithm(algo, format, this.isOperation);
            this._algoChanged = false;

            const call = $.post("/load", { basisStates: null, algo: algo + "\n",    //append \n because it doesn't matter
                                    // semantically, but the parser needs an empty line at the end and for better error
                                    // message we can't send the pre-formatted algorithm (which would have added \n if it
                                    // was missing)
                opNum: opNum, format: format, reset: reset, dataKey: dataKey });
            call.done((res) => {
                algo = temp.algo;
                if(temp.set) {
                    this._q_algo.val(algo);
                    //also set the highlights because the lines might have changed
                    this._hlManager.text = algo;
                    this._hlManager._updateDiv();
                }
                this._loadingSuccess(res, algo, opNum, format, reset);

                if(this._numOfOperations === 0) this._changeState(STATE_LOADED_EMPTY);
                else {
                    if(opNum === 0) this._changeState(STATE_LOADED_START);
                    else if(opNum === this._numOfOperations) this._changeState(STATE_LOADED_END);
                    else this._changeState(STATE_LOADED);
                }

                this._hideInvalidAlgoWarning();
                endLoadingAnimation();
            });
            call.fail((res) => {
                if(reset) {
                    this._hlManager.resetHighlighting("");
                    this._hlManager.setHighlights();
                }

                changeState(STATE_NOTHING_LOADED);
                endLoadingAnimation();

                if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload
                else if(res.status === 500) {
                    //showResponseError(res, "Couldn't connect to the server.");
                    if(res.responseJSON && res.responseJSON.msg) this._error(res.responseJSON.msg);
                    else this._error("Internal Server Error");

                } else {  //this should be invalid-algorithm-error
                    this._setLineNumbers();
                    const errMsg = this._parseErrorMessage(res);
                    this._showInvalidAlgoWarning(errMsg);
                    this._error(errMsg);
                }
            });
        }
    }

    _loadingSuccess(res, algo, opNum, format, reset) {
        this._oldAlgo = algo;

        if(reset) {
            this._hlManager.resetHighlighting(this._q_algo.val());
            this._hlManager.setHighlights();
        } else this._hlManager.text = this._q_algo.val();

        this._numOfOperations = res.data;
        //const digits = numOfDigits(Math.max(this._numOfOperations, 1)); //at least the initial padding of 1 digit
        //this._setQAlgoMarginLeft(digits);

        this._setLineNumbers();

        this._print(res.dot);
    }

    _showInvalidAlgoWarning(msg) {
        this._inv_algo_warning.css('display', 'block');
        this._inv_algo_warning.prop("title", msg);
    }

    _hideInvalidAlgoWarning() {
        this._inv_algo_warning.css('display', 'none');
    }

    _parseErrorMessage(res) {
        let errMsg = "Invalid algorithm at ";
        if(res.responseJSON && res.responseJSON.msg) {
            const parserError = res.responseJSON.msg;

            let lineStart = parserError.indexOf("l:");
            if(lineStart > -1) {
                lineStart += 2; //skip "l:"

                const lineEnd = parserError.indexOf(":", lineStart);
                if(lineEnd > -1) {

                    const lineMsg = parseInt(parserError.substring(lineStart, lineEnd));    //the line that is stated in the parser message
                    console.log("LineMsg = " + lineMsg);
                    const temp = this._line_numbers.html().split('\n');
                    let lineNumber;
                    if(temp.length < lineMsg || lineMsg <= 0) lineNumber = lineMsg;
                    else {
                        lineNumber = parseInt(temp[lineMsg-1]);   //use the number that the line numbering displays
                        //if no line numbers are there yet, we simply display the number from the parser error
                        if(!lineNumber) lineNumber = lineMsg;
                    }

                    const line = lineNumber;
                    if(line) {
                        let colStart = parserError.indexOf("c:", lineEnd-1);
                        if(colStart > -1) {
                            colStart += 2;

                            const colEnd = parserError.indexOf("msg:", colStart);
                            if(colEnd > -1) {
                                const column = parseInt(parserError.substr(colStart, colEnd));

                                errMsg += "line " + line + ", column " + column + "\n";

                            } else errMsg += "line " + line + "\n";
                        } else errMsg += "line " + line + "\n";
                    }
                }
            }

            const msgStart = parserError.indexOf("msg:") + 4;
            if(msgStart > -1) {
                //don't show the position information of the error, if there is any additionally (because the line is wrong and we've already created the information)
                const msgEnd = parserError.lastIndexOf(" in line");
                if(msgEnd > -1) errMsg += parserError.substring(msgStart, msgEnd);
                else errMsg += parserError.substring(msgStart);
            }
        }

        return errMsg;
    }


    resetAlgorithm() {
        //todo maybe just call this when set algo("")
        this._emptyAlgo = true;
        this.algoFormat = FORMAT_UNKNOWN;

        this._hlManager.resetHighlighting("");
        this._line_numbers.html("");  //remove line numbers
        this._q_algo.val("");   //todo remove when called for set algo("")
        this._setQAlgoMarginLeft();   //reset margin-left to the initial/default value

        this._print();    //reset dd

        this._changeState(STATE_NOTHING_LOADED);
    }

    updateSizes() {
        //console.log("q_algo's height = " + this._q_algo.css('height'));

        const dzInnerWidth = this._drop_zone.innerWidth();
        const marginLeft = parseFloat(this._q_algo.css('margin-left'));
        const width = dzInnerWidth - marginLeft;
        this._q_algo.css('width', width);

        this._updateHeights();

        /* //if we change lineHighlight dynamically, it may be two small if we start with a small window-width and later expand it
        if(dzInnerWidth > 0) {
            let lh = "<mark>";
            for(let i = 0; i < dzInnerWidth / 4; i++) lh += " ";
            lh += "</mark>";
            updateLineHighlight(lh);
        }
        */
    }

    _updateHeights() {
        const clientHeight = document.getElementById(this._idPrefix + "_q_algo").clientHeight;
        //set the height of line_numbers to the height of q_algo without scrollbar, so no offset can occur
        this._line_numbers.css('height', clientHeight);
        this._highlighting.css('height', clientHeight);
    }

    _setLineNumbers() {
        const lines = this._q_algo.val().split('\n');
        const digits = numOfDigits(this._numOfOperations > 0 ?
            this._numOfOperations :
            lines.length
        );

        let num = 0;
        for(let i = 0; i < lines.length; i++) {
            if(i <= this._hlManager.offset) lines[i] = "";
            else {
                if(this.isOperation(lines[i], this._algoFormat)) {
                    num++;
                    const numDigits = numOfDigits(num);

                    let space = "";
                    for(let j = 0; j < digits - numDigits; j++) space += "  ";
                    lines[i] = space + num.toString();

                } else lines[i] = "";
            }
        }

        let text = "";
        lines.forEach(l => text += l + "\n");
        this._line_numbers.html(text);
        this._setQAlgoMarginLeft(digits);
    }

    _setQAlgoMarginLeft(digits = 1) {
        if(digits < 1) digits = 1;  //set at least the default margin
        const margin = paddingLeftOffset + paddingLeftPerDigit * digits;
        this._q_algo.css('margin-left', margin); //need to set margin because padding is ignored when scrolling

        const width = this._drop_zone.innerWidth() - margin;
        this._q_algo.css('width', width);
    }

    handleDrop(event) {
        if(event.dataTransfer.items) {  //check if a file was transmitted/dropped
            for(let i = 0; i < event.dataTransfer.files.length; i++) {
                //determine which format to load or show an error
                let format = FORMAT_UNKNOWN;
                if(event.dataTransfer.files[i].name.endsWith(".qasm")) format = QASM_FORMAT;
                else if(event.dataTransfer.files[i].name.endsWith(".real")) format = REAL_FORMAT;
                else {
                    this._error("Filetype not supported!");
                    return;
                }

                const file = event.dataTransfer.files[i];
                const reader = new FileReader();
                reader.onload = (e) => {
                    if(e.target.result.trim().length > 0) {     //the file has content
                        this._q_algo.val(e.target.result);
                        this._algoChanged = true;
                        this._emptyAlgo = false;
                        this.loadAlgorithm(format, true);    //since a completely new algorithm has been uploaded we have to throw away the old simulation data

                    } else {
                        this.resetAlgorithm();//empty file does the same as deleting the content of q_algo
                        this._error("You've uploaded an empty file!");
                    }
                };
                reader.readAsBinaryString(file);
            }
        }
    }

    _handleInput() {
        if(isFirefox && runDia) {
            this._error("You are not allowed to edit the algorithm during the diashow or simulation-process!");
            this._q_algo.val(this._oldAlgo);
            return;
        }

        //todo maybe could be implemented more efficiently if only the lines with the cursor are considered?
        this._lastCursorPos = this._q_algo.prop('selectionStart');

        //console.log("Lines with Cursor are: ");
        //console.log(this._debugGetLinesWithCursor());
        //console.log("__________________________________");

        const newAlgo = this._q_algo.val();
        //we need to find out the format if possible
        if(this._algoFormat === FORMAT_UNKNOWN) this._algoFormat = this.findFormat(newAlgo);

        if(newAlgo.trim().length === 0) {   //user deleted everything, so we reset
            this.resetAlgorithm();
            return;
        }

        this._emptyAlgo = false;
        this._algoChanged = true;
        const curLines = newAlgo.split('\n');
        const oldLines = this._oldAlgo.split('\n');
        if(this._hlManager.highlightedLines > 0) {  //if nothing is highlighted yet, the user may also edit the lines before the first operation
            //check if a highlighted line changed, if yes abort the changes
            const lastLineWithHighlighting = this._hlManager.highlightedLines + this._hlManager.nopsInHighlighting;

            /*
            if(curLines.length < lastLineWithHighlighting) { //illegal change because at least the last line has been deleted
                q_algo.val(oldAlgo);   //reset algorithm to old input
                showError("You are not allowed to change already processed lines!");
                return;
            }
            */

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
            for(let i = 0; i < lastLineWithHighlighting; i++) {
                //non-highlighted lines may change, because they are no operations
                if((i < this._hlManager.offset || this._hlManager.isHighlighted(i)) //highlighted lines and the header are not allowed to change (but comments are)
                    && curLines[i] !== oldLines[i]) {   //illegal change!
                    this._q_algo.val(this._oldAlgo);   //reset algorithm to old input
                    this._selectLineWithCursor();
                    this._error("You are not allowed to change already processed lines!");
                    return;

                } else if(!this._hlManager.isHighlighted(i)) {
                    //you are not allowed to change a line with a comment to something else than a different comment!
                    if(AlgoArea.isComment(oldLines[i], this._algoFormat) && !AlgoArea.isComment(curLines[i], this._algoFormat)) {
                        this._q_algo.val(this._oldAlgo);   //reset algorithm to old input
                        this._selectLineWithCursor();
                        this._error("You are not allowed to change a comment to an operation that should already have been processed!");
                        return;
                    }
                }
            }
        }

        const lineDif = curLines.length - oldLines.length;
        if(lineDif > 0) {
            let text = "";
            for(let i = 0; i < lineDif; i++) {
                this._hlManager._addPendingLine();
                text += "\n";
            }
            this._hlManager._updateDiv();

            //const oldLNs = this._line_numbers.html();
            //this._line_numbers.html(oldLNs + text);
        }

        this._oldAlgo = this._q_algo.val();  //changes are legal so they are "saved"
        this._setLineNumbers();
        this._updateHeights();  //call here because the vertical scrollbar might have changed
    }

    _selectLineWithCursor() {
        const algo = this._q_algo.val();
        //console.log("Last cursor at " + this._lastCursorPos + ", char = " + algo.charAt(this._lastCursorPos));
        let lineStart = algo.lastIndexOf("\n", this._lastCursorPos) + 1;  //+1 because we need the index of the first character in the line
        let lineEnd;
        //special case where lastCursorPos is directly at the end of a line
        if(lineStart === this._lastCursorPos) {
            lineStart = algo.lastIndexOf("\n", this._lastCursorPos-2) + 1;    //lastCursorPos-1 would be the current lineStart, but we need one character before that
            lineEnd = this._lastCursorPos-1;  //the position right before \n

        } else lineEnd = algo.indexOf("\n", lineStart);
        //console.log("Char: " + algo.charAt(lineEnd));
        //console.log("Start = " + lineStart + ", End = " + lineEnd);

        this._q_algo.prop('selectionStart', lineStart);
        this._q_algo.prop('selectionEnd', lineEnd);
    }

    _handleScroll() {   //event is ignored in firefox if source (this._q_algo) is disabled
        const scrollTop = this._q_algo.scrollTop();

        this._line_numbers.scrollTop(scrollTop);
        this._highlighting.scrollTop(scrollTop);
    }

    findFormat(algo) {
        if(algo.includes("OPENQASM")) return QASM_FORMAT;
        else return REAL_FORMAT;      //right now only these two formats are supported, so if it is not QASM, it must be Real
    }

    /**Checks if the given QASM- or Real-line is an operation
     *
     * @param line of an algorithm
     * @param format of the line we check
     */
    isOperation(line, format = this._algoFormat) {
        if(line) {
            if(format === QASM_FORMAT) {
                return !(line.trim() === "" ||
                    line.includes("OPENQASM") ||
                    line.includes("include") ||
                    line.includes("reg") ||
                    AlgoArea.isComment(line, format));

            } else if(format === REAL_FORMAT) {
                return !(line.startsWith(".") ||   //all non-operation lines start with "."
                    AlgoArea.isComment(line, format));

            } else if(format === FORMAT_UNKNOWN) {
                //showError("Format not recognized. Please try again.");
                console.log("Format unkown. Line: " + line);
                return false;
            } else {
                //showError("Format not recognized. Please try again.");
                console.log("Format (" + format + ") not recognized");
                return false;
            }
        } else return false;
    }

    static isComment(line, format) {
        if(format === QASM_FORMAT) return line.trim().startsWith("//");
        else if(format === REAL_FORMAT) return line.trim().startsWith("#");
        else if(format === FORMAT_UNKNOWN) {
            console.log("Format unknown. Line: " + line);
            return true;
        } else {
            console.log("Format not recognized");
            return true;
        }
    }

    static containsComment(line, format) {
        if(format === QASM_FORMAT) return line.includes("//");
        else if(format === REAL_FORMAT) return line.includes("#");
        else {
            console.log("Format not recognized");
            return true;
        }
    }

    preformatAlgorithm(algo, format, isOperation) {
        let setQAlgo = false;

        //make sure every operation is in a separate line
        if(format === QASM_FORMAT) {
            let temp = "";
            const lines = algo.split('\n');
            for(let i = 0; i < lines.length; i++) {
                const line = lines[i];
                //"\n" needs to be added separately because it was removed while splitting
                if(isOperation(line, format)) {
                    if(i >= lines.length-1) {
                        //if the last line is an operation, the needed \n is added here and not at the end of the preformatting
                        // so we need to add the pending line here
                        console.log("added pending line as the last line is an operation");
                        this._hlManager._addPendingLine();
                        this._hlManager._updateDiv();
                    }

                    let l = line;
                    while(l.length !== 0) {
                        let index = l.indexOf(';');
                        if(index === -1) {  //no semicolon found
                            if(AlgoArea.containsComment(l, format)) {
                                //don't search for the missing ; because there is definitely a comment in between
                                temp += line + "\n";
                                l = ""; //make sure to leave the outer loop and continue with the outer-outer-loop
                                break;
                            }

                            //search for the missing ; in the following lines
                            temp += l;
                            i++;
                            while(i < lines.length) {
                                l = lines[i];
                                if(AlgoArea.isComment(l, format)) {
                                    temp += "\n";   //don't collapse the operation-line with the comment-line
                                    index = -1;     //a bit hacky, but needed so I don't have to copy code in a strange way
                                                    //what happens: since we immediately jump to the outer loop op will be empty and l will stay the same
                                                    // this makes sure that the whole comment (in the if afterwards we know that the first branch must be
                                                    // entered since l was a comment and didn't change) will be like it initially was
                                    break;
                                }
                                index = l.indexOf(';');
                                if(index === -1) temp += l;
                                else break;     //if we found a semicolon we can continue in the normal (outer) loop
                                i++;
                            }

                            if(index === -1) {  //we are in the last line and no ; was found
                                temp += "\n";
                                break;
                            }
                        }

                        const op =  l.substring(0, index+1);    //we need to include the semicolon, so it is index+1
                        l = l.substring(index+1);

                        //special case for comments in the same line as an operation
                        if(AlgoArea.isComment(l, format)) {
                            temp += op + l + "\n";  //the comment is allowed to stay in the same line
                            break;
                        } else temp += op + "\n";    //insert the operation with the added newLine
                        l = l.trim();
                    }
                } else {
                    temp += line;
                    //don't create a new line for the last line, because the way splitting works there was no \n at the end of the last line
                    if(i < lines.length-1) temp += "\n";
                }
            }
            algo = temp;
            setQAlgo = true;
        }
        //for REAL_FORMAT this is inherently the case, because \n is used to separate operations

        //append an empty line at the end if there is none yet
        if(!algo.endsWith("\n")) {
            algo = algo + "\n";
            setQAlgo = true;
            this._hlManager._addPendingLine();
            this._hlManager._updateDiv();
        }

        return {
            algo: algo,
            set: setQAlgo
        };
    }
}
