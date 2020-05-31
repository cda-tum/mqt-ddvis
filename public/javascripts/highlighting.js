
let lineHighlight = "<mark>                                                                                                                                  </mark>";
function updateLineHighlight(newLH) {
    lineHighlight = newLH;
}

class HighlightManager {
    _div;
    _isOperation;
    _hl;    //an array that tells us for each line if it is an operation or not
    _operationOffset = 0;
    _highlightedOps = 0;      //how many lines with Operations are highlighted
    _nopsInHighlighing = 0;   //how many lines of Non-Operations (comments, header) are between the first line
                              // and the last highlighted one

    constructor(highlightDiv, isOperation) {
        if(highlightDiv) this._div = highlightDiv;
        else throw Error("HighlightManager needs a div to apply the highlighting to!");

        if(isOperation) this._isOperation = isOperation;
        else throw Error("HighlightManager needs a function to determine if a line is an operation!");
    }

    set text(text) {
        //calculate new operationOffset for the new text and decide for each line of the text whether
        // it is an operation (therefore will be highlighted) or not
        this._operationOffset = -1;
        const lines = text.split('\n');
        this._hl = [];
        for(let i = 0; i < lines.length; i++) {
            if(this._operationOffset < 0) {             //operation offset hasn't been found yet
                if(this._isOperation(lines[i])) {
                    //we found the first operation so the offset is one line before the current one
                    this._operationOffset = i-1;
                    this._hl.push(true);

                } else this._hl.push(false);

            } else this._hl.push(this._isOperation(lines[i]));
        }
    }

    get offset() {
        return this._operationOffset;
    }

    get highlightedLines() {
        return this._highlightedOps;
    }

    set highlightedLines(l) {
        this._highlightedOps = l;
    }

    get nopsInHighlighting() {
        return this._nopsInHighlighing;
    }

    isHighlighted(i) {
        if(i < this._highlightedOps + this._nopsInHighlighing)
            return this._hl[i];
        else return false;  //line is definitely not highlighted (yet)
    }

    resetHighlighting(newText) {
        this._highlightedOps = 0;
        this._nopsInHighlighing = 0;
        this.text = newText;

        //todo reset content of div?
    }

    setHighlights() {
        let text = "";
        if(this._highlightedOps === 0) {  //special case for "no highlighting yet"
            text = lineHighlight;   //just highlight the first line giving information about the format
            this._hl.forEach(l => {
                text += l;
                text += "\n";
            });
            this._nopsInHighlighing = 0;    //todo or should it be 1? it is a nop-line, but it is highlighted nonetheless

        } else {
            let opLines = 0;
            let nopLines = 0;
            let i;
            for(i = 0; i < this._hl.length; i++) {
                if(opLines < this._highlightedOps) {  //highlighting may still be applied
                    if(this._hl[i]) {   //this is a line with an operation
                        opLines++;
                        text += lineHighlight;
                    } //else this is a line without highlighting
                    else nopLines++;
                }
                text += "\n";
            }

            this._nopsInHighlighing = nopLines;
        }

        this._div.html(text);
    }

}