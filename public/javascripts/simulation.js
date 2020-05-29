//################### J-QUERY ELEMENTS ###############################################################################################################

const step_duration = $('#stepDuration');
const automatic = $('#automatic');
const drop_zone = $('#drop_zone');
const backdrop = $('#backdrop');
const q_algo = $('#q_algo');
const algo_div = $('#algo_div');
const qddText = $('#qdd_text');
//todo also initialize all other selectors once?


//################### CONFIGURATION ##################################################################################################################
const paddingLeftOffset = 10;   //10px is the padding of lineNumbers, so q_algo also needs at least this much padding
const paddingLeftPerDigit = 10; //padding of q_algo based on the number of digits the line-numbering needs

let stepDuration = 700;   //in ms

//################### STATE MANAGEMENT ##################################################################################################################
//states of the simulation tab
const STATE_NOTHING_LOADED = 0;     //initial state, goes to LOADED
const STATE_LOADED = 1;             //can go to SIMULATING and DIASHOW, both of them can lead to LOADED (somewhere between start and end)
const STATE_LOADED_START = 2;       //can go to SIMULATING, DIASHOW, LOADED or LOADED_END
const STATE_LOADED_END = 3;         //can go to LOADED or LOADED_START
const STATE_SIMULATING = 4;         //can go to LOADED
const STATE_DIASHOW = 5;            //can go to LOADED

let runDia = false;
let pauseDia = false;

function changeState(state) {
    let enable;
    let disable;
    switch (state) {
        case STATE_NOTHING_LOADED:
            enable = [ "drop_zone", "q_algo", "ex_deutsch", "ex_alu", "stepDuration" ];
            disable = [ "toStart", "prev", "automatic", "next", "toEnd" ];
            break;

        case STATE_LOADED:
            enable = [ "drop_zone", "q_algo", "toStart", "prev", "automatic", "next", "toEnd",
                        "ex_deutsch", "ex_alu", "stepDuration" ];
            disable = [  ];
            break;

        case STATE_LOADED_START:
            enable = [ "drop_zone", "q_algo", "automatic", "next", "toEnd", "ex_deutsch", "ex_alu", "stepDuration" ];
            disable = [ "toStart", "prev" ];
            break;

        case STATE_LOADED_END:
            enable = [ "drop_zone", "q_algo", "toStart", "prev", "ex_deutsch", "ex_alu", "stepDuration" ];
            disable = [ "toEnd", "next", "automatic" ];   //don't disable q_algo because the user might want to add lines to the end //todo re-enable #next if lines are added?
            break;

        case STATE_SIMULATING:
            enable = [];
            disable = [ "drop_zone", "q_algo", "toStart", "prev", "automatic", "next", "toEnd",
                        "ex_deutsch", "ex_alu", "stepDuration" ];
            break;

        case STATE_DIASHOW:
            runDia = true;
            pauseDia = false;
            automatic.text("||");   //\u23F8
            enable = [ "automatic" ];
            disable = [ "drop_zone", "q_algo", "toStart", "prev", "next", "toEnd",
                        "ex_deutsch", "ex_alu", "stepDuration" ];        //todo should next (maybe even toEnd) be enabled?
            break;
    }

    enableElementsWithID(enable);
    disableElementsWithID(disable);
}

function enableElementsWithID(ids) {
    ids.forEach((id) => {
        const elem = document.getElementById(id);
        elem.disabled = false;
    });
}

function disableElementsWithID(ids) {
    ids.forEach((id) => {
        const elem = document.getElementById(id);
        elem.disabled = true;
    });
}

//################### UI INITIALIZATION ##################################################################################################################
//from https://www.w3schools.com/howto/howto_js_accordion.asp
const acc = document.getElementsByClassName("accordion");
for (let i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", () => {
        /* Toggle between adding and removing the "active" class,
        to highlight the button that controls the panel */
        acc[i].classList.toggle("active");

        /* Toggle between hiding and showing the active panel */
        const panel = acc[i].nextElementSibling;
        if (panel.style.display === "block") panel.style.display = "none";
        else panel.style.display = "block";
    });
}

window.addEventListener('resize', (event) => updateSizes());
function updateSizes() {
    //console.log(screen.availHeight);
    //backdrop.css('width', drop_zone.css('width')) - 2 * parseInt(drop_zone.css('border'));
    //console.log(backdrop.css('width'));

    const dzInnerWidth = parseInt(drop_zone.css('width')) - 2 * parseInt(drop_zone.css('border'));  //inner width of drop_zone
    const width = dzInnerWidth - q_algo.css('margin-left');
    q_algo.css('width', width);

    if(dzInnerWidth > 0) {
        lineHighlight = "<mark>";
        for(let i = 0; i < dzInnerWidth / 4; i++) lineHighlight += " ";
        lineHighlight += "</mark>";
    }
}
let lineHighlight = "<mark>                                                                                                                                  </mark>";
updateSizes();


function validateStepDuration() {
    const newVal = parseInt(step_duration.val());
    console.log(newVal);
    if(0 <= newVal) {
        stepDuration = newVal;
        step_duration.val(newVal);  //needs to be done because of parseInt possible Floats are cut off

    } else {
        showError("Invalid number for step-duration: Only integers allowed!");
        step_duration.val(stepDuration);
        return false;
    }
}


changeState(STATE_NOTHING_LOADED);      //initial state




//################### ALGORITHM LOADING ##################################################################################################################
const FORMAT_UNKNOWN = 0;
const QASM_FORMAT = 1;
const REAL_FORMAT = 2;

/**Load empty QASM-Format
 *
 */
function loadQASM() {
    q_algo.val(
        "OPENQASM 2.0;\n" +
        "include \"qelib1.inc\";\n" +
        "\n" +
        "qreg q[];\n" +
        "creg c[];\n" +
        "\n"
    );
    algoFormat = QASM_FORMAT;
}

/**Load empty Real-Format
 *
 */
function loadReal() {
    q_algo.val(
        ".version 2.0 \n" +
        ".numvars 0 \n" +
        ".variables \n" +
        ".begin \n" +
        "\n" +
        ".end \n"
    );
    algoFormat = REAL_FORMAT;
}

function loadDeutsch() {
    q_algo.val(
        "OPENQASM 2.0;\n" +
        "include \"qelib1.inc\";\n" +
        "\n" +
        "qreg q[2];\n" +
        "creg c[2];\n" +
        "\n" +
        "x q[1];\n" +
        "h q[0];\n" +
        "h q[1];\n" +
        "cx q[0],q[1];\n" +
        "h q[0];\n"
    );

    loadAlgorithm(QASM_FORMAT, true);   //new algorithm -> new simulation
}

function loadAlu() {
    q_algo.val(
        "OPENQASM 2.0;\n" +
        "include \"qelib1.inc\";\n" +
        "qreg q[5];\n" +
        "creg c[5];\n" +
        "cx q[2],q[1];\n" +
        "cx q[2],q[0];\n" +
        "h q[2];\n" +
        "t q[3];\n" +
        "t q[0];\n" +
        "t q[2];\n" +
        "cx q[0],q[3];\n" +
        "cx q[2],q[0];\n" +
        "cx q[3],q[2];\n" +
        "tdg q[0];\n" +
        "cx q[3],q[0];\n" +
        "tdg q[3];\n" +
        "tdg q[0];\n" +
        "t q[2];\n" +
        "cx q[2],q[0];\n" +
        "cx q[3],q[2];\n" +
        "cx q[0],q[3];\n" +
        "h q[2];\n" +
        "h q[0];\n" +
        "t q[1];\n" +
        "t q[4];\n" +
        "t q[0];\n" +
        "cx q[4],q[1];\n" +
        "cx q[0],q[4];\n" +
        "cx q[1],q[0];\n" +
        "tdg q[4];\n" +
        "cx q[1],q[4];\n" +
        "tdg q[1];\n" +
        "tdg q[4];\n" +
        "t q[0];\n" +
        "cx q[0],q[4];\n" +
        "cx q[1],q[0];\n" +
        "cx q[4],q[1];\n" +
        "h q[0];\n" +
        "h q[2];\n" +
        "t q[3];\n" +
        "t q[0];\n" +
        "t q[2];\n" +
        "cx q[0],q[3];\n" +
        "cx q[2],q[0];\n" +
        "cx q[3],q[2];\n" +
        "tdg q[0];\n" +
        "cx q[3],q[0];\n" +
        "tdg q[3];\n" +
        "tdg q[0];\n" +
        "t q[2];\n" +
        "cx q[2],q[0];\n" +
        "cx q[3],q[2];\n" +
        "cx q[0],q[3];\n" +
        "h q[2];\n" +
        "h q[0];\n" +
        "t q[1];\n" +
        "t q[4];\n" +
        "t q[0];\n" +
        "cx q[4],q[1];\n" +
        "cx q[0],q[4];\n" +
        "cx q[1],q[0];\n" +
        "tdg q[4];\n" +
        "cx q[1],q[4];\n" +
        "tdg q[1];\n" +
        "tdg q[4];\n" +
        "t q[0];\n" +
        "cx q[0],q[4];\n" +
        "cx q[1],q[0];\n" +
        "cx q[4],q[1];\n" +
        "h q[0];\n" +
        "cx q[4],q[3];\n" +
        "h q[2];\n" +
        "t q[0];\n" +
        "t q[3];\n" +
        "t q[2];\n" +
        "cx q[3],q[0];\n" +
        "cx q[2],q[3];\n" +
        "cx q[0],q[2];\n" +
        "tdg q[3];\n" +
        "cx q[0],q[3];\n" +
        "tdg q[0];\n" +
        "tdg q[3];\n" +
        "t q[2];\n" +
        "cx q[2],q[3];\n" +
        "cx q[0],q[2];\n" +
        "cx q[3],q[0];\n" +
        "h q[2];\n" +
        "x q[2];\n"
    );

    loadAlgorithm(QASM_FORMAT, true);   //new algorithm -> new simulation
}

//let basisStates = null;
/*function validate() {
    const basic_states = document.getElementById("basic_states");
    const arr = basic_states.value.split(" ");

    basicStates = [];
    arr.forEach(value => {
        const index = value.indexOf("j");
        if(0 <= value.indexOf("+")) {   //complex number
            console.log(value + " is a complex number");

            const parts = value.split("+");
            if(parts.length === 2) {

            }

        } else if(0 <= value.indexOf("-")) {   //complex number
            console.log(value + " is a complex number");


        } else if(index === 0 || index === value.length-1) {      //imaginary number
            console.log(value + " is a imaginary number");

            if(index === 0) value = value.substring(1);
            else value = value.substring(0, index);

            const num = parseFloat(value);
            if(num) basicStates.push(new Complex(0, num));
            else {
                document.getElementById("output").value = "Error! " + value + " is no float!";  //todo error
            }

        } else {            //real number
            console.log(value + " is a real number");

            const num = parseFloat(value);
            if(num) basicStates.push(new Complex(num, 0));
            else {
                document.getElementById("output").value = "Error! " + value + " is no float!";  //todo error
            }
        }
    });

    basicStates.forEach(value => console.log("bs: " + value));
}
function validate() {
    $(() => {
        const basis_states = $('#basis_states').val();


        $.post("/validate", { basisStates: basis_states },
            (res) => {
            }
        ).fail();
    });
}
*/

function dropHandler(event) {
    event.preventDefault();     //prevents the browser from opening the file and therefore leaving the website

    if(event.dataTransfer.items) {  //check if a file was transmitted/dropped
        for(let i = 0; i < event.dataTransfer.files.length; i++) {
            //determine which format to load or show an error
            let format = FORMAT_UNKNOWN;
            if(event.dataTransfer.files[i].name.endsWith(".qasm")) format = QASM_FORMAT;
            else if(event.dataTransfer.files[i].name.endsWith(".real")) format = REAL_FORMAT;
            else {
                showError("Filetype not supported!");
                return;
            }

            const file = event.dataTransfer.files[i];
            const reader = new FileReader();
            reader.onload = function(e) {
                q_algo.val(e.target.result);
                loadAlgorithm(format, true);    //since a completely new algorithm has been uploaded we have to throw away the old simulation data
            };
            reader.readAsBinaryString(file);
        }
    }
}

let algoFormat = FORMAT_UNKNOWN;
let numOfOperations = 0;    //number of operations the whole algorithm has
/**Loads the algorithm placed inside the textArea #q_algo
 *
 * @param format the format in which the algorithm is written; the only occasion where this parameter is not set
 *        is when leaving the textArea after editing, but in this case the format didn't change so the old algoFormat is used
 * @param reset whether a new simulation needs to be started after loading; default false because again the only occasion
 *        it is not set is after editing, but there we especially don't want to reset
 */
function loadAlgorithm(format = algoFormat, reset = false) {
        const startTimeStemp = performance.now();
    //$(() => {
        //const basis_states = $('#basis_states').val();
        //console.log("Basis states: " + basis_states);
        let algo = q_algo.val();
        const opNum = reset ?
            parseInt($('#startLine').val()) :
            highlightedLines;   //we want to continue simulating after the last processed line, which is after the highlighted ones

        if(format === FORMAT_UNKNOWN) {
            //find out of which format the input text is
            if(algo.startsWith("OPENQASM")) format = QASM_FORMAT;
            else format = REAL_FORMAT;      //right now only these two formats are supported, so if it is not QASM, it must be Real
        }

        if(algo) {
            algo = preformatAlgorithm(algo, format);
            const call = $.post("/load", { basisStates: null, algo: algo, opNum: opNum, format: format, reset: reset });

            let flag = true;
            const waitFunc = () => {
                if(flag) {
                    console.log("still waiting");
                    setTimeout(() => waitFunc(), 100);
                }
            };
            setTimeout(() => waitFunc(), 100);

            call.done((res) => {
                flag = false;   //todo also set on error

                algoFormat = format;
                oldInput = algo;

                if(reset) {
                    resetHighlighting();
                    highlightedLines = opNum;
                    updateHighlighting();
                }

                numOfOperations = res.data;  //number of operations the algorithm has
                const digits = _numOfDigits(numOfOperations);
                const margin = paddingLeftOffset + paddingLeftPerDigit * digits;
                q_algo.css('margin-left', margin); //need to set margin because padding is ignored when scrolling

                const width = parseInt(drop_zone.css('width')) - margin - 2 * parseInt(drop_zone.css('border'));
                q_algo.css('width', width);

                setLineNumbers();

                print(res.dot);

                //if the user-chosen number is too big, we go as far as possible and enter the correct value in the textField
                if(opNum > numOfOperations) $('#startLine').val(numOfOperations);

                if(opNum === 0) changeState(STATE_LOADED_START);
                else if(opNum === numOfOperations) changeState(STATE_LOADED_END);
                else changeState(STATE_LOADED);
            });
            call.fail((res) => {
                showResponseError(res, "Couldn't connect to the server.");
            });
            console.log("Loading and processing " + opNum + " lines took " + (performance.now() - startTimeStemp) + "ms");
        }
    //});
}

function preformatAlgorithm(algo, format) {

    if(!algo.endsWith("\n")) {
       algo = algo + "\n";
       q_algo.val(algo);
    }

    //todo? every operation needs to be in a separate line
    //if(format === ...

    return algo;
}

//################### API BUTTONS ##################################################################################################################
$(() =>  {
    /* ######################################################### */
    $('#toStart').on('click', () => {
        changeState(STATE_SIMULATING);
        const call = $.ajax({
            url: '/tostart',
            contentType: 'application/json',
            success: (res) => {
                if(res.dot) {
                    print(res.dot);
                    highlightedLines = 0;
                    updateHighlighting();
                }
                changeState(STATE_LOADED_START);
            }
        });
        call.fail((res) => {
           showResponseError(res, "Going back to the start failed!");
            changeState(STATE_LOADED);
        });
    });
    /* ######################################################### */
    $('#prev').on('click', () => {
        changeState(STATE_SIMULATING);
        const call = $.ajax({
            url: '/prev',
            contentType: 'application/json',
            success: (res) => {
                if(res.dot) {
                    print(res.dot);

                    highlightedLines--;
                    updateHighlighting();
                    //removeHighlightedLine();

                    if(highlightedLines <= 0) changeState(STATE_LOADED_START);
                    else changeState(STATE_LOADED);

                } else changeState(STATE_LOADED_START); //should never reach this code because the button should be disabled when we reach the start
            }
        });
        call.fail((res) => {
           showResponseError(res, "Going a step back failed!");
           changeState(STATE_LOADED);
        });
    });
    /* ######################################################### */
    $('#next').on('click', () => {
        const startTimeStemp = performance.now();
        changeState(STATE_SIMULATING);
        const call = $.ajax({
            url: '/next',
            contentType: 'application/json',
            success: (res) => {
                if(res.dot) {   //we haven't reached the end yet
                    print(res.dot);

                    highlightedLines++;
                    updateHighlighting();
                    //addHighlightedLine();

                    if(highlightedLines >= numOfOperations) changeState(STATE_LOADED_END);
                    else changeState(STATE_LOADED);

                } else changeState(STATE_LOADED_END); //should never reach this code because the button should be disabled when we reach the end

                console.log("Time spent: " + (performance.now() - startTimeStemp) + "ms");
            }
        });
        call.fail((res) => {
            showResponseError(res, "Going a step ahead failed!");
            changeState(STATE_LOADED);
        });
    });
    /* ######################################################### */
    $('#toEnd').on('click', () => {
        changeState(STATE_SIMULATING);
        const call = $.ajax({
            url: '/toend',
            contentType: 'application/json',
            success: (res) => {
                if(res.dot) {
                    print(res.dot);

                    highlightedLines = 0;
                    const lines = q_algo.val().split('\n');
                    for(let i = 0; i < lines.length; i++) {
                        if(isOperation(lines[i])) highlightedLines++;
                    }
                    updateHighlighting()
                }
                changeState(STATE_LOADED_END);
            }
        });
        call.fail((res) => {
            showResponseError(res, "Going back to the start failed!");
            changeState(STATE_LOADED);
        });
    });
    /* ######################################################### */
    automatic.on('click', () => {
        if(runDia) {
            endDia();

        } else {
            runDia = true;
            changeState(STATE_DIASHOW);

            const func = () => {
                if(!pauseDia) {
                    const startTime = performance.now();
                    const call = $.ajax({
                        url: '/next',
                        contentType: 'application/json',
                        success: (res) => {

                            if(res.dot) {
                                print(res.dot);

                                highlightedLines++;
                                updateHighlighting();

                                const duration = performance.now() - startTime;     //calculate the duration of the API-call so the time between two steps is constant
                                console.log(duration);
                                setTimeout(() => func(), stepDuration - duration); //wait a bit so the current qdd can be shown to the user

                            } else endDia();
                        }
                    });
                    call.fail((res) => {
                        showResponseError(res, "Going a step ahead failed! Aborting Diashow."); //todo notify user that the diashow was aborted if res-msg is shown?
                        endDia();
                    });
                }
            };
            setTimeout(() => func(), stepDuration);
        }
    });
    /*
    $('#stop').on('click', () => {
        pauseDia = true;
        runDia = false;

        if(highlightedLines >= numOfOperations) changeState(STATE_LOADED_END);
        else changeState(STATE_LOADED);
    });
     */
});



//################### LINE HIGHLIGHTING ##################################################################################################################
function resetHighlighting() {
    highlightedLines = 0;

    const lines = q_algo.val().split('\n');
    for(let i = 0; i < lines.length; i++) {
        if(isOperation(lines[i])) {
            operationOffset = i-1;  //can never be negative because the file has to start with the QASM-header
            break;
        }
    }
}

function updateHighlighting() {
    const highlighting = $('#highlighting');

    const text = q_algo.val();
    const highlightedText = applyHighlights(text);
    highlighting.html(highlightedText);
}

/**Checks if the given QASM- or Real-line is an operation
 *
 * @param line of an algorithm
 */
function isOperation(line) {
    if(line) {
        if(algoFormat === QASM_FORMAT) {
            if( line.trim() === "" ||
                line.includes("OPENQASM") ||
                line.includes("include") ||
                line.includes("reg") ||
                line.startsWith("//")   //comment
            ) return false;
            return true;

        } else if(algoFormat === REAL_FORMAT) {
            if( line.startsWith(".") ||   //all non-operation lines start with "."
                line.startsWith("#")    //comment
            ) return false;
            return true;

        } else {
            //showError("Format not recognized. Please try again.");  //todo change message?
            console.log("Format not recognized");
            return false;
        }
    } else return false;
}

let operationOffset = 0;        //on which line the QASM-header ends - next line is the first operation
let highlightedLines = 0;
function applyHighlights(text) {
    if(highlightedLines === 0) {
        const lines = text.split('\n');
        lines[0] = lineHighlight;   //just highlight the first line giving information about the format
        text = "";
        lines.forEach(l => {
            text += l;
            text += "\n";
        });
    }

    const lines = text.split('\n');
    let opLines = 0;
    for(let i = 0; i < lines.length-1; i++) {
        if(isOperation(lines[i])) {
            if(++opLines === highlightedLines) {
                lines[i] = lineHighlight;
                break;  //so no non-operation lines get highlighted after the last (highlighted) operation-line
            }
        }
        if(opLines <= highlightedLines) lines[i] = lineHighlight;
        else break;
    }

    text = "";
    lines.forEach(l => {
       text += l;
       text += "\n";
    });

    //if (isIE) {
    //    // IE wraps whitespace differently in a div vs textarea, this fixes it
    //    text = text.replace(/ /g, ' <wbr>');
    //}

    return text;
}

/*
function addHighlightedLine() {
    const highlighting = $('#highlighting');
    highlighting.html(highlighting.html() + "\n<mark>      a            </mark>");

    console.log("Log: " + highlighting.html());
}

function removeHighlightedLine() {
    const highlighting = $('#highlighting');
    const lines = highlighting.html().split('\n');
    const end = lines.lastIndexOf("\n");
    highlighting.html(lines.substring(0, end));
}
*/

function bindEvents() {
    q_algo.on({
        'input': handleInput,
        'scroll': handleScroll
    });
}
bindEvents();

//################### LINE NUMBERING ##################################################################################################################
/*
Only works for integers!
 */
function _numOfDigits(num) {
    return String(num).length;
}

function setLineNumbers() {
    const lineNumbers = $('#line_numbers');
    const digits = _numOfDigits(numOfOperations);

    const lines = q_algo.val().split('\n');
    let num = 0;
    for(let i = 0; i < lines.length; i++) {
        if(i <= operationOffset) lines[i] = "";
        else {
            if(isOperation(lines[i])) {
                num++;
                //const num = (i - operationOffset);
                const numDigits = _numOfDigits(num);

                let space = "";
                for(let j = 0; j < digits - numDigits; j++) space += "  ";
                lines[i] = space + num.toString();

            } else lines[i] = "";
        }
    }

    let text = "";
    lines.forEach(l => text += l + "\n");
    lineNumbers.html(text);
}


//################### HIGHLIGHTING and NUMBERING ##################################################################################################################

//highlighting and line numbering              ONLY WORKS IF EACH LINE CONTAINS NO MORE THAN 1 OPERATION!!!
//adapted from: https://codepen.io/lonekorean/pen/gaLEMR
function handleScroll() {
    const scrollTop = q_algo.scrollTop();

    $('#backdrop').scrollTop(scrollTop);
    $('#line_numbers').scrollTop(scrollTop);

    //const scrollLeft = q_algo.scrollLeft();
    //console.log(scrollLeft);
    //$('#backdrop').scrollLeft(scrollLeft);
}

let oldInput;   //needed to reset input if an illegal change was made
function handleInput() {
    const highlighting = $('#highlighting');

    if(highlightedLines > 0) {  //if nothing is highlighted yet, the user may also edit the lines before the first operation
        //check if a highlighted line changed, if yes abort the changes
        const linesNew = q_algo.val().split('\n');
        const linesOld = oldInput.split('\n');
        for(let i = 0; i <= highlightedLines + operationOffset; i++) {
            if(linesNew.length <= i || linesNew[i] !== linesOld[i]) {   //illegal change!
                q_algo.val(oldInput);   //reset algorithm to old input
                showError("You are not allowed to change already processed lines!");
                return;
            }
        }
    }
    oldInput = q_algo.val();  //changes are legal so they are "saved"

    const highlightedText = applyHighlights(q_algo.val());
    highlighting.html(highlightedText);

    setLineNumbers();
}





//################### ERROR HANDLING ##################################################################################################################
function showResponseError(res, altMsg = "Unknown Error!") {
    if(res.responseJSON && res.responseJSON.msg) showError(res.responseJSON.msg);
    else showError(altMsg);
}

function showError(error) {
    alert(error);
}

//$( document ).ajaxError(function( event, request, settings ) {
//    showError( "Unhandled error occured! Error requesting page " + settings.url);
//});



//################### MISC ##################################################################################################################

function endDia() {
    pauseDia = true;
    runDia = false;

    if(highlightedLines >= numOfOperations) changeState(STATE_LOADED_END);
    else changeState(STATE_LOADED);
    automatic.text("\u25B6");   //play-symbol in unicode
    //document.getElementById("stop").disabled = false;   //enable stop button
}

let svgHeight = 0;  //can't be initialized beforehand
function print(dot) {
    if(svgHeight === 0) {
        //subtract the whole height of the qdd-text from the height of qdd-div to get the space that is available for the graph
        svgHeight = parseInt($('#qdd_div').css('height')) - (
            parseInt(parseInt(qddText.css('height'))) + parseInt(qddText.css('margin-top')) + parseInt(qddText.css('margin-bottom'))    //height of the qdd-text
        );
    }

    const graph = d3.select("#qdd_div").graphviz({
        width: "70%",     //make it smaller so we have space around where we can scroll through the page - also the graphs are more high than wide so is shouldn't be a problem
        height: svgHeight,
        fit: true           //automatically zooms to fill the height (or width, but usually the graphs more high then wide)
    }).renderDot(dot);
}