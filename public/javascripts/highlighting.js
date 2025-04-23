// Copyright (c) 2023 - 2025 Chair for Design Automation, TUM
// Copyright (c) 2025 Munich Quantum Software Company GmbH
// All rights reserved.
//
// SPDX-License-Identifier: MIT
//
// Licensed under the MIT License

//Make the width of the highlights dependent on the screen-width so at least in full-screen mode and smaller window sizes the highlighting looks correct.
// If users make the window bigger than their screen, the highlighting may get to small but aside from defining it way to large, there doesn't seem to be
// a solution to this.
let lineHighlight_temp = "<mark>"; //                                                                                                                                  ";
for (let i = 0; i < screen.width / 14; i++) {
  //14 proved through testing to be a fitting number
  lineHighlight_temp += " ";
}
lineHighlight_temp += "</mark>";
const lineHighlight = lineHighlight_temp;

/**Manages the highlights that should occur in a given div based on the text inside a given AlgoArea.
 *
 */
class HighlightManager {
  /**
   *
   * @param highlightDiv {div} will contain the produces highlight-marks
   * @param algoArea {AlgoArea} determines which lines should be highlighted
   */
  constructor(highlightDiv, algoArea) {
    if (highlightDiv) this._div = highlightDiv;
    else
      throw Error("HighlightManager needs a div to apply the highlighting to!");

    if (algoArea) this._algoArea = algoArea;
    else
      throw Error(
        "HighlightManager needs a function to determine if a line is an operation!",
      );

    this._hl; //an array that tells us for each line if it is an operation or not
    this._operationOffset = 0; //number of lines before the first operation occurs
    this._highlightedOps = 0; //how many lines with Operations are highlighted
    this._nopsInHighlighting = 0; //how many lines of Non-Operations (comments, header) are between the first line and the last highlighted one
    this._processedText = ""; //the lines that already have been processed (both highlighted and empty lines)
    this._pendingText = ""; //the lines that still need to be processed (needed for scrolling)
  }

  /**Changes the text and initializes some variables to determine the lines with operations for future highlighting.
   *
   * @param text {string} the new text the highlighting should be applied to
   */
  set text(text) {
    //calculate new operationOffset for the new text and decide for each line of the text whether
    // it is an operation (therefore could be highlighted in the future) or not
    this._operationOffset = -1;
    const lines = text.split("\n");
    this._hl = [];
    let insideGateDef = false; //whether we are currently between "{" and "}" of a gate definition or not
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("{")) {
        //we found a gate definition
        insideGateDef = true;
      }

      if (insideGateDef) {
        this._hl.push(false); //we are currently not at an operation because we are inside a gate definition
        //check if the gate definition ends in this line
        if (lines[i].includes("}")) insideGateDef = false;
      } else {
        if (this._operationOffset < 0) {
          //operation offset hasn't been found yet
          if (this._algoArea.isOperation(lines[i])) {
            //we found the first operation so the offset is one line before the current one
            this._operationOffset = i - 1;
            this._hl.push(true);
          } else this._hl.push(false);
        } else this._hl.push(this._algoArea.isOperation(lines[i]));
      }
    }

    //the pending text is every line that hasn't been processed yet
    this._pendingText = "";
    const pendingLines =
      lines.length - (this._highlightedOps + this._nopsInHighlighting);
    for (let i = 0; i < pendingLines; i++) this._pendingText += "\n";
  }

  get offset() {
    return this._operationOffset;
  }

  get highlightedLines() {
    return this._highlightedOps;
  }

  get nopsInHighlighting() {
    return this._nopsInHighlighting;
  }

  /**Checks if the given line is currently highlighted. For out of range indices false is returned.
   *
   * @param i index of the line we want to check
   * @returns {boolean} whether the given line is currently highlighted or not
   */
  isHighlighted(i) {
    if (i < this._highlightedOps + this._nopsInHighlighting) return this._hl[i];
    else return false; //line is definitely not highlighted (yet)
  }

  /*
    //not needed at the moment
    getNopsUpToLine(lineNum) {
        let num = 0;
        for(let i = 0; i < lineNum && i < this._hl.length; i++) {
            if(!this._hl[i]) num++;
        }
        return num;
    }
    */

  /**Resets the highlights as if no operations has been processed yet and sets a new text.
   *
   * @param newText {string} the new text the highlighting should adapt to
   */
  resetHighlighting(newText) {
    this._highlightedOps = 0;
    this._nopsInHighlighting = 0;
    this._processedText = "";

    this.text = newText;

    this._div.html("");
  }

  /**Resets back to the initial highlighting as if no operation has been processed.
   * Similar to resetHighlighting, but doesn't change the text.
   *
   */
  initialHighlighting() {
    this._highlightedOps = 0;
    this._nopsInHighlighting = 0;
    this._processedText = "";
    this._pendingText = "";
    this._hl.forEach((l) => (this._pendingText += "\n"));

    this._div.html(this._pendingText); //special case so not the usual updateDiv()
  }

  /**Adds an additional highlighted line. Non-operation lines in between are skipped without highlighting.
   * Adds at least one line to processedText and respectively removes at least one line from pendingText.
   */
  increaseHighlighting() {
    //add possible nops between the highlighting and next operation
    for (
      let i = this._highlightedOps + this._nopsInHighlighting;
      i < this._hl.length && !this._hl[i]; //abort as soon as we have found the next operation
      i++
    ) {
      this._addProcessedLine();
      this.removePendingLine();

      this._nopsInHighlighting++;
    }

    this._addProcessedLine(true); //add lineHighlight
    this.removePendingLine();
    this._highlightedOps++;

    this._updateDiv();
  }

  /**Removes one highlighted line. Non-operation lines in between are skipped without highlighting.
   * Adds at least one line to pendingText and respectively removes at least one line from processedText.
   *
   */
  decreaseHighlighting() {
    this._removeProcessedLine();
    this.addPendingLine();
    this._highlightedOps--;

    //remove possible nops inside the highlighting
    for (
      let i = this._highlightedOps + this._nopsInHighlighting - 1; //-1 because we want the last highlighted line, not the potential next one
      i >= 0 && !this._hl[i]; //abort as soon as we have found the last operation
      i--
    ) {
      this._removeProcessedLine();
      this.addPendingLine();

      this._nopsInHighlighting--;
    }

    if (this._highlightedOps === 0) {
      this.initialHighlighting();
      /* //more efficient approach, because we don't have to iterate over the whole hl, but it would need more testing I think
            this._nopsInHighlighting = 0;
            this._pendingText += this._processedText;
            this._processedText = "";
            this._div.html(lineHighlight + this._pendingText);  //special case so not the usual updateDiv()
            */
    } else this._updateDiv();
  }

  /**Highlights every line with an operation in the text.
   * PendingText will just have the newline that is needed at the end of an algorithm
   *
   */
  highlightEverything() {
    //hl.length-1 because the last line is always \n and has nothing to do with the algorithm
    for (
      let i = this._highlightedOps + this._nopsInHighlighting;
      i < this._hl.length - 1;
      i++
    ) {
      if (this._hl[i]) {
        this._addProcessedLine(true); //add lineHighlight
        this._highlightedOps++;
      } else {
        this._addProcessedLine();
        this._nopsInHighlighting++;
      }
    }

    this._pendingText = "\n"; //pending text is the \n at the very end that we skipped

    this._updateDiv();
  }

  /**Increases or decreases highlighting until the given number of operations are highlighted.
   *
   * @param ops {number} target value of this._highlightedOps
   */
  highlightToXOps(ops) {
    if (ops < this._highlightedOps) {
      while (ops < this._highlightedOps) {
        this.decreaseHighlighting();
      }
    } else if (ops > this._highlightedOps) {
      while (ops > this._highlightedOps) {
        this.increaseHighlighting();
      }
    } //else ops === this._highlighedOps so nothing to do
  }

  /**Sets the highlighting completely new, regardless of the previous highlights. The previous functions are just more
   * efficient versions of this general approach that take advantage of the previous state of the highlights.
   *
   */
  setHighlights() {
    if (this._highlightedOps === 0) {
      //special case for "no highlighting yet"
      this.initialHighlighting();
    } else {
      this._processedText = "";
      this._pendingText = "";
      let opLines = 0;
      let nopLines = 0;
      let i;
      for (i = 0; i < this._hl.length; i++) {
        if (opLines < this._highlightedOps) {
          //highlighting may still be applied
          if (this._hl[i]) {
            //this is a line with an operation
            opLines++;
            this._processedText += lineHighlight;
          } //else this is a line without highlighting
          else nopLines++;
          this._processedText += "\n";
        } else this._pendingText += "\n";
      }

      this._nopsInHighlighting = nopLines;
      this._updateDiv();
    }
  }

  /**Updates the content of the div so the highlights appear visually.
   *
   * @private
   */
  _updateDiv() {
    this._div.html(this._processedText + this._pendingText);
  }

  /**Adds either a highlighted or empty line to processedText.
   *
   * @param highlight {boolean} whether a highlighted line should be added or an empty one
   * @private
   */
  _addProcessedLine(highlight = false) {
    const line = highlight ? lineHighlight : "";
    this._processedText += line + "\n";
  }

  /**Removes one line from processedText.
   *
   * @private
   */
  _removeProcessedLine() {
    //length-1 would start at the end, but we want to skip the \n at the very end which is interpreted as 1 character
    const index = this._processedText.lastIndexOf(
      "\n",
      this._processedText.length - 2,
    );
    this._processedText = this._processedText.substring(0, index + 1); //+1 because we still need the \n we found with lastIndexOf
    //this needs to be done so "complicated" because we don't know if there is <mark>...</mark> between the last two
    // "\n"s and we can't say for sure how long the mark is, because the size might have been updated in the meantime
  }

  /**Adds an empty line to pendingText.
   *
   *
   */
  addPendingLine() {
    this._pendingText += "\n";
  }

  /**Removes one line (simply \n) from pendingText.
   *
   *
   */
  removePendingLine() {
    this._pendingText = this._pendingText.substring(1); //remove one \n
  }
}
