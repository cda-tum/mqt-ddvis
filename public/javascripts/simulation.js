//################### J-QUERY ELEMENTS ###############################################################################################################

const automatic = $('#automatic');
const drop_zone = $('#drop_zone');
const backdrop = $('#backdrop');
const q_algo = $('#q_algo');
const algo_div = $('#algo_div');
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


window.addEventListener('resize', (event) => {
    console.log(screen.availHeight);
    //backdrop.css('width', drop_zone.css('width')) - 2 * parseInt(drop_zone.css('border'));
    //console.log(backdrop.css('width'));
});



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
        ".version 2.0\n" +
        ".numvars \n" +
        ".variables \n" +
        ".inputs \n" +
        ".outputs \n" +
        ".constants \n" +
        ".garbage \n" +
        ".begin \n"
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
    //$(() => {
        //const basis_states = $('#basis_states').val();
        //console.log("Basis states: " + basis_states);
        const algo = q_algo.val();
        const opNum = reset ?
            parseInt($('#startLine').val()) :
            highlightedLines;   //we want to continue simulating after the last processed line, which is after the highlighted ones

        if(format === FORMAT_UNKNOWN) {
            //find out of which format the input text is
            if(algo.startsWith("OPENQASM")) format = QASM_FORMAT;
            else format = REAL_FORMAT;      //right now only these two formats are supported, so if it is not QASM, it must be Real
        }

        if(algo) {
            const call = $.post("/load", { basisStates: null, algo: algo, opNum: opNum, format: format, reset: reset });
            call.done((res) => {
                algoFormat = format;
                preformatAlgorithm();

                oldInput = algo;

                if(reset) {
                    resetHighlighting();
                    highlightedLines = opNum;
                    updateHighlighting();   //todo does this need to be called when we didn't reset?
                }

                numOfOperations = res.msg;  //number of operations the algorithm has
                const digits = _numOfDigits(numOfOperations);
                const margin = paddingLeftOffset + paddingLeftPerDigit * digits;
                q_algo.css('margin-left', margin); //need to set margin because padding is ignored when scrolling

                const width = parseInt(drop_zone.css('width')) - margin - 2 * parseInt(drop_zone.css('border'));
                q_algo.css('width', width);

                setLineNumbers();

                print(res.svg);

                //if the user-chosen number is too big, we go as far as possible and enter the correct value in the textField
                if(opNum > numOfOperations) $('#startLine').val(numOfOperations);

                if(opNum === 0) changeState(STATE_LOADED_START);
                else if(opNum === numOfOperations) changeState(STATE_LOADED_END);
                else changeState(STATE_LOADED);
            });
            call.fail((res) => {
                showResponseError(res, "Couldn't connect to the server.");
            });
        }
    //});
}

function preformatAlgorithm() {
    //const algo = $('#q_algo');

    //TODO implement?
    //every operation needs to be in a separate line
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
                if(res.svg) {
                    print(res.svg);
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
                if(res.svg) {
                    print(res.svg);

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
        changeState(STATE_SIMULATING);
        const call = $.ajax({
            url: '/next',
            contentType: 'application/json',
            success: (res) => {

                if(res.svg) {   //we haven't reached the end yet
                    print(res.svg);

                    highlightedLines++;
                    updateHighlighting();
                    //addHighlightedLine();

                    if(highlightedLines >= numOfOperations) changeState(STATE_LOADED_END);
                    else changeState(STATE_LOADED);

                } else changeState(STATE_LOADED_END); //should never reach this code because the button should be disabled when we reach the end
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
                if(res.svg) {
                    print(res.svg);

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

            updateStepDuration();
            changeState(STATE_DIASHOW);

            const func = () => {
                if(!pauseDia) {
                    const startTime = performance.now();
                    const call = $.ajax({
                        url: '/next',
                        contentType: 'application/json',
                        success: (res) => {

                            const duration = performance.now() - startTime;     //calculate the duration of the API-call so the time between two steps is constant
                            if(res.svg) {
                                print(res.svg);

                                highlightedLines++;
                                updateHighlighting();

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
 * @param text
 */
function isOperation(text) {
    if(text) {
        if(algoFormat === QASM_FORMAT) {
            if( text.trim() === "" ||
                text.includes("OPENQASM") ||
                text.includes("include") ||
                text.includes("reg"))
                return false;

            return true;

        } else if(algoFormat === REAL_FORMAT) {
            return !text.startsWith(".");   //all non-operation lines start with "."

        } else {
            //showError("Format not recognized. Please try again.");  //todo change message?
            console.log("Format not recognized");
            return false;
        }
    } else return false;
}

let operationOffset = 0;        //on which line the QASM-header ends - next line is the first operation
let highlightedLines = 0;
const lineHighlight = "<mark>                                         </mark>";     //todo adjust text content so it matches line-width as good as possible
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
    for(let i = 0; i < lines.length; i++) {
        if(i <= operationOffset) lines[i] = "";
        else {
            const num = (i - operationOffset);
            const numDigits = _numOfDigits(num);

            let space = "";
            for(let j = 0; j < digits - numDigits; j++) space += "  ";
            lines[i] = space + num.toString();
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

$( document ).ajaxError(function( event, request, settings ) {
    showError( "Unhandled error occured! Error requesting page " + settings.url);
});



//################### MISC ##################################################################################################################

function endDia() {
    pauseDia = true;
    runDia = false;

    if(highlightedLines >= numOfOperations) changeState(STATE_LOADED_END);
    else changeState(STATE_LOADED);
    automatic.text("\u25B6");   //play-symbol in unicode
    //document.getElementById("stop").disabled = false;   //enable stop button
}

function updateStepDuration() {
    const newVal = $("#stepDuration").val();
    if(0 <= newVal) stepDuration = newVal;
    else {
        showError("Invalid number for step-duration: Only integers allowed!");
        $('#stepDuration').val(stepDuration);
    }
}

function print(svg) {
    const graph = d3.select("#qdd_div").graphviz({
        width: "70%",     //make it smaller so we have space around where we can scroll through the page - also the graphs are more high than wide so is shouldn't be a problem
        height: "100%",
        fit: true           //automatically zooms to fill the height (or width, but usually the graphs more high then wide)
    }).renderDot(svg);
}

function test() {
    const svg_content =
        //"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n" +
        //"<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\"\n" +
        //" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n" +
        //"<!-- Generated by graphviz version 2.40.1 (20161225.0304)\n" +
        //" -->\n" +
        //"<!-- Title: DD Pages: 1 -->\n" +
        "<svg\n" +
        " viewBox=\"0.00 0.00 109.50 656.58\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n" +
        "<g id=\"graph0\" class=\"graph\" transform=\"scale(1 1) rotate(0) translate(4 652.5827)\">\n" +
        "<title>DD</title>\n" +
        "<polygon fill=\"#ffffff\" stroke=\"transparent\" points=\"-4,4 -4,-652.5827 105.4983,-652.5827 105.4983,4 -4,4\"/>\n" +
        "<!-- T -->\n" +
        "<g id=\"node1\" class=\"node\">\n" +
        "<title>T</title>\n" +
        "<polygon fill=\"none\" stroke=\"#000000\" points=\"54,-36 0,-36 0,0 54,0 54,-36\"/>\n" +
        "<text text-anchor=\"middle\" x=\"27\" y=\"-14.3\" font-family=\"Times,serif\" font-size=\"14.00\" fill=\"#000000\">1</text>\n" +
        "</g>\n" +
        "<!-- R -->\n" +
        "<g id=\"node2\" class=\"node\">\n" +
        "<title>R</title>\n" +
        "<ellipse fill=\"#000000\" stroke=\"#000000\" cx=\"82\" cy=\"-646.7827\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 0 -->\n" +
        "<g id=\"node3\" class=\"node\">\n" +
        "<title>0</title>\n" +
        "<ellipse fill=\"#d3d3d3\" stroke=\"#000000\" cx=\"82\" cy=\"-589.4844\" rx=\"19.4965\" ry=\"19.4965\"/>\n" +
        "<text text-anchor=\"middle\" x=\"82\" y=\"-585.7844\" font-family=\"Times,serif\" font-size=\"14.00\" fill=\"#000000\">q4</text>\n" +
        "</g>\n" +
        "<!-- R&#45;&gt;0 -->\n" +
        "<g id=\"edge1\" class=\"edge\">\n" +
        "<title>R&#45;&gt;0</title>\n" +
        "<path fill=\"none\" stroke=\"#000000\" d=\"M82,-644.8763C82,-640.6677 82,-630.0965 82,-619.3035\"/>\n" +
        "<polygon fill=\"#000000\" stroke=\"#000000\" points=\"85.5001,-619.088 82,-609.088 78.5001,-619.0881 85.5001,-619.088\"/>\n" +
        "</g>\n" +
        "<!-- 0h0 -->\n" +
        "<g id=\"node4\" class=\"node\">\n" +
        "<title>0h0</title>\n" +
        "<ellipse fill=\"#000000\" stroke=\"#000000\" cx=\"71\" cy=\"-532.1862\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 0&#45;&gt;0h0 -->\n" +
        "<g id=\"edge2\" class=\"edge\">\n" +
        "<title>0&#45;&gt;0h0</title>\n" +
        "<path fill=\"none\" stroke=\"#006400\" d=\"M78.2759,-570.0858C75.6831,-556.5799 72.5004,-540.0014 71.398,-534.2593\"/>\n" +
        "</g>\n" +
        "<!-- 0h2 -->\n" +
        "<g id=\"node5\" class=\"node\">\n" +
        "<title>0h2</title>\n" +
        "<ellipse fill=\"#ff0000\" stroke=\"#ff0000\" cx=\"93\" cy=\"-532.1862\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 0&#45;&gt;0h2 -->\n" +
        "<g id=\"edge4\" class=\"edge\">\n" +
        "<title>0&#45;&gt;0h2</title>\n" +
        "<path fill=\"none\" stroke=\"#ff0000\" d=\"M85.7241,-570.0858C88.3169,-556.5799 91.4996,-540.0014 92.602,-534.2593\"/>\n" +
        "</g>\n" +
        "<!-- 1 -->\n" +
        "<g id=\"node6\" class=\"node\">\n" +
        "<title>1</title>\n" +
        "<ellipse fill=\"#d3d3d3\" stroke=\"#000000\" cx=\"71\" cy=\"-474.8879\" rx=\"19.4965\" ry=\"19.4965\"/>\n" +
        "<text text-anchor=\"middle\" x=\"71\" y=\"-471.1879\" font-family=\"Times,serif\" font-size=\"14.00\" fill=\"#000000\">q3</text>\n" +
        "</g>\n" +
        "<!-- 0h0&#45;&gt;1 -->\n" +
        "<g id=\"edge3\" class=\"edge\">\n" +
        "<title>0h0&#45;&gt;1</title>\n" +
        "<path fill=\"none\" stroke=\"#000000\" d=\"M71,-530.2797C71,-526.0711 71,-515.4999 71,-504.7069\"/>\n" +
        "<polygon fill=\"#000000\" stroke=\"#000000\" points=\"74.5001,-504.4915 71,-494.4915 67.5001,-504.4915 74.5001,-504.4915\"/>\n" +
        "</g>\n" +
        "<!-- 1h0 -->\n" +
        "<g id=\"node7\" class=\"node\">\n" +
        "<title>1h0</title>\n" +
        "<ellipse fill=\"#000000\" stroke=\"#000000\" cx=\"60\" cy=\"-417.5896\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 1&#45;&gt;1h0 -->\n" +
        "<g id=\"edge5\" class=\"edge\">\n" +
        "<title>1&#45;&gt;1h0</title>\n" +
        "<path fill=\"none\" stroke=\"#006400\" d=\"M67.2759,-455.4893C64.6831,-441.9834 61.5004,-425.4049 60.398,-419.6627\"/>\n" +
        "</g>\n" +
        "<!-- 1h2 -->\n" +
        "<g id=\"node8\" class=\"node\">\n" +
        "<title>1h2</title>\n" +
        "<ellipse fill=\"#ff0000\" stroke=\"#ff0000\" cx=\"82\" cy=\"-417.5896\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 1&#45;&gt;1h2 -->\n" +
        "<g id=\"edge7\" class=\"edge\">\n" +
        "<title>1&#45;&gt;1h2</title>\n" +
        "<path fill=\"none\" stroke=\"#ff0000\" d=\"M74.7241,-455.4893C77.3169,-441.9834 80.4996,-425.4049 81.602,-419.6627\"/>\n" +
        "</g>\n" +
        "<!-- 2 -->\n" +
        "<g id=\"node9\" class=\"node\">\n" +
        "<title>2</title>\n" +
        "<ellipse fill=\"#d3d3d3\" stroke=\"#000000\" cx=\"60\" cy=\"-360.2913\" rx=\"19.4965\" ry=\"19.4965\"/>\n" +
        "<text text-anchor=\"middle\" x=\"60\" y=\"-356.5913\" font-family=\"Times,serif\" font-size=\"14.00\" fill=\"#000000\">q2</text>\n" +
        "</g>\n" +
        "<!-- 1h0&#45;&gt;2 -->\n" +
        "<g id=\"edge6\" class=\"edge\">\n" +
        "<title>1h0&#45;&gt;2</title>\n" +
        "<path fill=\"none\" stroke=\"#000000\" d=\"M60,-415.6832C60,-411.4746 60,-400.9034 60,-390.1104\"/>\n" +
        "<polygon fill=\"#000000\" stroke=\"#000000\" points=\"63.5001,-389.8949 60,-379.895 56.5001,-389.895 63.5001,-389.8949\"/>\n" +
        "</g>\n" +
        "<!-- 2h0 -->\n" +
        "<g id=\"node10\" class=\"node\">\n" +
        "<title>2h0</title>\n" +
        "<ellipse fill=\"#000000\" stroke=\"#000000\" cx=\"49\" cy=\"-302.9931\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 2&#45;&gt;2h0 -->\n" +
        "<g id=\"edge8\" class=\"edge\">\n" +
        "<title>2&#45;&gt;2h0</title>\n" +
        "<path fill=\"none\" stroke=\"#006400\" d=\"M56.2759,-340.8928C53.6831,-327.3868 50.5004,-310.8083 49.398,-305.0662\"/>\n" +
        "</g>\n" +
        "<!-- 2h2 -->\n" +
        "<g id=\"node11\" class=\"node\">\n" +
        "<title>2h2</title>\n" +
        "<ellipse fill=\"#ff0000\" stroke=\"#ff0000\" cx=\"71\" cy=\"-302.9931\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 2&#45;&gt;2h2 -->\n" +
        "<g id=\"edge10\" class=\"edge\">\n" +
        "<title>2&#45;&gt;2h2</title>\n" +
        "<path fill=\"none\" stroke=\"#ff0000\" d=\"M63.7241,-340.8928C66.3169,-327.3868 69.4996,-310.8083 70.602,-305.0662\"/>\n" +
        "</g>\n" +
        "<!-- 3 -->\n" +
        "<g id=\"node12\" class=\"node\">\n" +
        "<title>3</title>\n" +
        "<ellipse fill=\"#d3d3d3\" stroke=\"#000000\" cx=\"49\" cy=\"-245.6948\" rx=\"19.4965\" ry=\"19.4965\"/>\n" +
        "<text text-anchor=\"middle\" x=\"49\" y=\"-241.9948\" font-family=\"Times,serif\" font-size=\"14.00\" fill=\"#000000\">q1</text>\n" +
        "</g>\n" +
        "<!-- 2h0&#45;&gt;3 -->\n" +
        "<g id=\"edge9\" class=\"edge\">\n" +
        "<title>2h0&#45;&gt;3</title>\n" +
        "<path fill=\"none\" stroke=\"#000000\" d=\"M49,-301.0867C49,-296.8781 49,-286.3068 49,-275.5138\"/>\n" +
        "<polygon fill=\"#000000\" stroke=\"#000000\" points=\"52.5001,-275.2984 49,-265.2984 45.5001,-275.2984 52.5001,-275.2984\"/>\n" +
        "</g>\n" +
        "<!-- 3h0 -->\n" +
        "<g id=\"node13\" class=\"node\">\n" +
        "<title>3h0</title>\n" +
        "<ellipse fill=\"#000000\" stroke=\"#000000\" cx=\"38\" cy=\"-188.3965\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 3&#45;&gt;3h0 -->\n" +
        "<g id=\"edge11\" class=\"edge\">\n" +
        "<title>3&#45;&gt;3h0</title>\n" +
        "<path fill=\"none\" stroke=\"#006400\" d=\"M45.2759,-226.2962C42.6831,-212.7903 39.5004,-196.2118 38.398,-190.4697\"/>\n" +
        "</g>\n" +
        "<!-- 3h2 -->\n" +
        "<g id=\"node14\" class=\"node\">\n" +
        "<title>3h2</title>\n" +
        "<ellipse fill=\"#ff0000\" stroke=\"#ff0000\" cx=\"60\" cy=\"-188.3965\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 3&#45;&gt;3h2 -->\n" +
        "<g id=\"edge13\" class=\"edge\">\n" +
        "<title>3&#45;&gt;3h2</title>\n" +
        "<path fill=\"none\" stroke=\"#ff0000\" d=\"M52.7241,-226.2962C55.3169,-212.7903 58.4996,-196.2118 59.602,-190.4697\"/>\n" +
        "</g>\n" +
        "<!-- 4 -->\n" +
        "<g id=\"node15\" class=\"node\">\n" +
        "<title>4</title>\n" +
        "<ellipse fill=\"#d3d3d3\" stroke=\"#000000\" cx=\"38\" cy=\"-131.0983\" rx=\"19.4965\" ry=\"19.4965\"/>\n" +
        "<text text-anchor=\"middle\" x=\"38\" y=\"-127.3983\" font-family=\"Times,serif\" font-size=\"14.00\" fill=\"#000000\">q0</text>\n" +
        "</g>\n" +
        "<!-- 3h0&#45;&gt;4 -->\n" +
        "<g id=\"edge12\" class=\"edge\">\n" +
        "<title>3h0&#45;&gt;4</title>\n" +
        "<path fill=\"none\" stroke=\"#000000\" d=\"M38,-186.4901C38,-182.2815 38,-171.7103 38,-160.9173\"/>\n" +
        "<polygon fill=\"#000000\" stroke=\"#000000\" points=\"41.5001,-160.7018 38,-150.7019 34.5001,-160.7019 41.5001,-160.7018\"/>\n" +
        "</g>\n" +
        "<!-- 4h0 -->\n" +
        "<g id=\"node16\" class=\"node\">\n" +
        "<title>4h0</title>\n" +
        "<ellipse fill=\"#000000\" stroke=\"#000000\" cx=\"27\" cy=\"-73.8\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 4&#45;&gt;4h0 -->\n" +
        "<g id=\"edge14\" class=\"edge\">\n" +
        "<title>4&#45;&gt;4h0</title>\n" +
        "<path fill=\"none\" stroke=\"#006400\" d=\"M34.2759,-111.6997C31.6831,-98.1938 28.5004,-81.6153 27.398,-75.8731\"/>\n" +
        "</g>\n" +
        "<!-- 4h2 -->\n" +
        "<g id=\"node17\" class=\"node\">\n" +
        "<title>4h2</title>\n" +
        "<ellipse fill=\"#ff0000\" stroke=\"#ff0000\" cx=\"49\" cy=\"-73.8\" rx=\"1.8\" ry=\"1.8\"/>\n" +
        "</g>\n" +
        "<!-- 4&#45;&gt;4h2 -->\n" +
        "<g id=\"edge16\" class=\"edge\">\n" +
        "<title>4&#45;&gt;4h2</title>\n" +
        "<path fill=\"none\" stroke=\"#ff0000\" d=\"M41.7241,-111.6997C44.3169,-98.1938 47.4996,-81.6153 48.602,-75.8731\"/>\n" +
        "</g>\n" +
        "<!-- 4h0&#45;&gt;T -->\n" +
        "<g id=\"edge15\" class=\"edge\">\n" +
        "<title>4h0&#45;&gt;T</title>\n" +
        "<path fill=\"none\" stroke=\"#000000\" d=\"M27,-71.9434C27,-67.7589 27,-57.1154 27,-46.3776\"/>\n" +
        "<polygon fill=\"#000000\" stroke=\"#000000\" points=\"30.5001,-46.2613 27,-36.2614 23.5001,-46.2614 30.5001,-46.2613\"/>\n" +
        "</g>\n" +
        "</g>\n" +
        "</svg>\n";

    return svg_content;
}