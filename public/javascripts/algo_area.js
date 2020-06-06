
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
    _drop_zone;
    _line_numbers;
    _backdrop;
    _highlighting;
    _q_algo;

    _hlManager;
    _changeState;   //function to change the state on the callers side  //todo how to handle the state codes?
    _print;         //function to print the DD on the callers side
    _error;     //function on the callers side for handling errors

    _algoFormat = FORMAT_UNKNOWN;
    _emptyAlgo = false;
    _algoChanged = true;
    _lastValidAlgorithm;    //todo initialize
    _numOfOperations = 0;
    _oldAlgo;           //the old input (maybe not valid, but needed if the user edit lines they are not allowed to change)
    _lastCursorPos = 0;

    constructor(div, idPrefix, changeState, print, error) {
        //todo what about resizing?

        //todo dropHandler and dragOverHandler
        //this._drop_zone = $('<div></div>');//<div id="drop_zone" class=".container" ondrop="dropHandler(event)" ondragover="dragOverHandler(event)">
        //this._drop_zone.attr('id', idPrefix + '_drop_zone');
        //div.append(this._drop_zone);
        this._drop_zone = $(
            '<div id="' + idPrefix + '_drop_zone" class="drop_zone" ' +
            //'ondrop="dropHandler(event)" ondragover="dragOverHandler(event)"' +
            '>' +
            '</div>'
        );
        this._drop_zone.on({
           'drop': (event) => this._handleDrop(event),  //todo doesn't seem to work
           'dragover': (event) => this._handleDragOver(event)
        });

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
            //'onfocusout="aaloadAlgorithm(' + 'lineHighlight' + ')" ' +
            'placeholder="Enter Algorithm or drop .qasm-/.real-File here."' +
            'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
            '</textarea>'
        );
        //this._q_algo.focusout(() => this.loadAlgorithm());
        this._q_algo.on({
            'focusout': () => this.loadAlgorithm(),
            'input': () => this._handleInput(),
            'scroll': () => this._handleScroll()
        });

        div.append(this._drop_zone);
        this._drop_zone.append(this._line_numbers);
        this._drop_zone.append(this._backdrop);
        this._drop_zone.append(this._q_algo);

        this._backdrop.append(this._highlighting);



        this._hlManager = new HighlightManager(this._highlighting, this);
        this._changeState = changeState;
        this._print = print;
        this._error = error;
    }

    get algo() {
        return this._q_algo.val();
    }

    set algo(algo) {
        this._q_algo.val(algo);
        this._hlManager.text = algo;
    }

    get hlManager() {
        return this._hlManager;
    }

    get numOfOperations() {
        return this._numOfOperations;
    }

    set algoFormat(f) {
        this._algoFormat = f;   //todo check if value is valid?
        console.log(this._algoFormat);
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
     * @param algorithm only needed if the lastValidAlgorithm should be sent again because the algorithm in q_algo is invalid
     */
    loadAlgorithm(format = this._algoFormat, reset = false, algorithm) {
        if(this._emptyAlgo || !this._algoChanged) return;

        let algo = algorithm || this._q_algo.val();   //usually q_algo.val() is taken
        const opNum = reset ?
            0 : //parseInt(line_to_go.val()) :
            this._hlManager.highlightedLines;   //we want to continue simulating after the last processed line, which is after the highlighted ones

        if(format === FORMAT_UNKNOWN) {
            //find out of which format the input text is
            if(algo.includes("OPENQASM")) format = QASM_FORMAT;
            else format = REAL_FORMAT;      //right now only these two formats are supported, so if it is not QASM, it must be Real
        }

        if(algo) {
            const temp = this._hlManager._preformatAlgorithm(algo, format);
            algo = temp.algo;
            if(temp.set) this._q_algo.val(algo);

            const call = $.post("/load", { basisStates: null, algo: algo, opNum: opNum, format: format, reset: reset });
            call.done((res) => {
                this._loadingSuccess(res, algo, opNum, format, reset);

                if(opNum === 0) this._changeState(STATE_LOADED_START);
                else if(opNum === this._numOfOperations) this._changeState(STATE_LOADED_END);
                else this._changeState(STATE_LOADED);
            });
            call.fail((res) => {
                if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

                //todo ask if this really is necessary or has any benefit, because disabling the buttons seems far more intuitive and cleaner
                if(res.responseJSON && res.responseJSON.retry && !algorithm) {
                    const call2 = $.post("/load", { basisStates: null, algo: this._lastValidAlgorithm, opNum: opNum, format: format, reset: reset });
                    call2.done((res2) => {
                        this._loadingSuccess(res2, this._lastValidAlgorithm, opNum, format, reset);

                        this._q_algo.prop('selectionStart', this._lastCursorPos);
                        this._q_algo.prop('selectionEnd', this._lastCursorPos+1);

                        //set the focus and scroll to the cursor positoin - doesn't work on Opera
                        this._q_algo.blur();
                        this._q_algo.focus();
                        $.trigger({ type: 'keypress' });
                    });
                    // call2.fail((res2) => {
                    //    showResponseError(res, )
                    // });
                }
                changeState(STATE_NOTHING_LOADED);
                showResponseError(res, "Couldn't connect to the server.");
            });
        }
    }

    _loadingSuccess(res, algo, opNum, format, reset) {
        this.algoFormat = format;
        this._oldAlgo = algo;
        this._algoChanged = false;
        this._lastValidAlgorithm = algo;  //algorithm in q_algo was valid if no error occured

        if(reset) {
            this._hlManager.resetHighlighting(this._q_algo.val());
            this._hlManager.highlightedLines = opNum;
            this._hlManager.setHighlights();
        } else this._hlManager.text = this._q_algo.val();

        this._numOfOperations = Math.max(res.data, 1);  //number of operations the algorithm has; at least the initial padding of 1 digit
        const digits = numOfDigits(this._numOfOperations);
        this._setQAlgoMarginLeft(digits);

        this._setLineNumbers();

        this._print(res.dot);

        //if the user-chosen number is too big, we go as far as possible and enter the correct value in the textField
        //if(line_to_go && opNum > this._numOfOperations) line_to_go.val(this._numOfOperations);  //todo maybe change this, because it is only "needed" for Simulation
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
        const dzInnerWidth = parseFloat(this._drop_zone.css('width'))
                            - 2 * parseFloat(this._drop_zone.css('border'));  //width of drop_zone between its borders
        const width = dzInnerWidth - parseFloat(this._q_algo.css('margin-left'));
        this._q_algo.css('width', width);

        if(dzInnerWidth > 0) {
            let lh = "<mark>";
            for(let i = 0; i < dzInnerWidth / 4; i++) lh += " ";
            lh += "</mark>";
            updateLineHighlight(lh);
        }
    }

    _setLineNumbers() {
        const digits = numOfDigits(this._numOfOperations);

        const lines = this._q_algo.val().split('\n');
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
    }

    _setQAlgoMarginLeft(digits = 1) {
        const margin = paddingLeftOffset + paddingLeftPerDigit * digits;
        this._q_algo.css('margin-left', margin); //need to set margin because padding is ignored when scrolling

        const width = parseInt(this._drop_zone.css('width')) - margin - 2 * parseInt(this._drop_zone.css('border'));
        this._q_algo.css('width', width);
    }

    _handleDrop(event) {
        console.log(event);
        event.preventDefault();     //prevents the browser from opening the file and therefore leaving the website

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
                reader.onload = (e) => this._dropLoad(e);
                reader.readAsBinaryString(file);
            }
        }
    }

    _dropLoad(e) {
        this._q_algo.val(e.target.result);
        this._algoChanged = true;
        this.loadAlgorithm(format, true);    //since a completely new algorithm has been uploaded we have to throw away the old simulation data
    }

    _handleDragOver(event) {
        event.preventDefault();
    }

    _handleInput() {
        this._lastCursorPos = this._q_algo.prop('selectionStart');

        const newAlgo = this._q_algo.val();
        if(newAlgo.trim().length === 0) {   //user deleted everything, so we reset
            this.resetAlgorithm();
            return;
        }

        this._emptyAlgo = false;
        this._algoChanged = true;
        if(this._hlManager.highlightedLines > 0) {  //if nothing is highlighted yet, the user may also edit the lines before the first operation
            //check if a highlighted line changed, if yes abort the changes
            const curLines = newAlgo.split('\n');
            const lastLineWithHighlighting = this._hlManager.highlightedLines + this._hlManager.nopsInHighlighting;

            /*
            if(curLines.length < lastLineWithHighlighting) { //illegal change because at least the last line has been deleted
                q_algo.val(oldAlgo);   //reset algorithm to old input
                showError("You are not allowed to change already processed lines!");
                return;
            }
            */

            const oldLines = this._oldAlgo.split('\n');
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
            for(let i = 0; i <= lastLineWithHighlighting; i++) {
                //non-highlighted lines may change, because they are no operations
                if((i < this._hlManager.offset || this._hlManager.isHighlighted(i)) //highlighted lines and the header are not allowed to change (but comments are)
                    && curLines[i] !== oldLines[i]) {   //illegal change!
                    this._q_algo.val(this._oldAlgo);   //reset algorithm to old input
                    this._error("You are not allowed to change already processed lines!");
                    this._selectLineWithCursor();
                    return;
                }
            }
        }

        this._oldAlgo = this._q_algo.val();  //changes are legal so they are "saved"
        this._setLineNumbers();
    }

    _selectLineWithCursor() {
        const algo = this._q_algo.val();
        let lineStart = algo.lastIndexOf("\n", this._lastCursorPos) + 1;  //+1 because we need the index of the first character in the line
        let lineEnd;
        //special case where lastCursorPos is directly at the end of a line
        if(lineStart === this._lastCursorPos) {
            lineStart = algo.lastIndexOf("\n", this._lastCursorPos-2) + 1;    //lastCursorPos-1 would be the current lineStart, but we need one character before that
            lineEnd = this._lastCursorPos-1;  //the position right before \n

        } else lineEnd = algo.indexOf("\n", lineStart);

        this._q_algo.prop('selectionStart', lineStart);
        this._q_algo.prop('selectionEnd', lineEnd);
    }

    _handleScroll() {
        const scrollTop = this._q_algo.scrollTop();

        this._line_numbers.scrollTop(scrollTop);
        this._highlighting.scrollTop(scrollTop);
    }

    /**Checks if the given QASM- or Real-line is an operation
     *
     * @param line of an algorithm
     * @param format of the line we check
     */
    isOperation(line, format = this._algoFormat) {
        if(line) {
            if(format === QASM_FORMAT) {
                if( line.trim() === "" ||
                    line.includes("OPENQASM") ||
                    line.includes("include") ||
                    line.includes("reg") ||
                    AlgoArea.isComment(line, format)
                ) return false;
                return true;

            } else if(format === REAL_FORMAT) {
                if( line.startsWith(".") ||   //all non-operation lines start with "."
                    AlgoArea.isComment(line, format)
                ) return false;
                return true;

            } else {
                //showError("Format not recognized. Please try again.");  //todo change message?
                console.log("Format (" + format + ") not recognized");
                return false;
            }
        } else return false;
    }

    static isComment(line, format) {
        if(format === QASM_FORMAT) return line.trimStart().startsWith("//");
        else if(format === REAL_FORMAT) return line.trimStart().startsWith("#");
        else {
            console.log("Format not recognized");
            return true;
        }
    }
}