//################### J-QUERY ELEMENTS ###############################################################################################################

const step_duration = $('#stepDuration');
const algo_div = $('#algo_div');
const automatic = $('#automatic');
const qdd_div = $('#qdd_div');
const qdd_text = $('#qdd_text');
//todo also initialize all other selectors once?


//################### CONFIGURATION ##################################################################################################################

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
            enable = [ "sim_drop_zone", "sim_q_algo", "ex_real", "ex_qasm", "ex_deutsch", "ex_alu", "stepDuration" ];
            disable = [ "toStart", "prev", "automatic", "next", "toEnd", "toLine" ];
            break;

        case STATE_LOADED:
            enable = [  "sim_drop_zone", "sim_q_algo", "toStart", "prev", "automatic", "next", "toEnd", "toLine",
                        "ex_real", "ex_qasm", "ex_deutsch", "ex_alu", "stepDuration" ];
            disable = [  ];
            break;

        case STATE_LOADED_START:
            enable = [  "sim_drop_zone", "sim_q_algo", "automatic", "next", "toEnd", "toLine", "ex_real", "ex_qasm",
                        "ex_deutsch", "ex_alu", "stepDuration" ];
            disable = [ "toStart", "prev" ];
            break;

        case STATE_LOADED_END:
            enable = [ "sim_drop_zone", "sim_q_algo", "toStart", "prev", "toLine", "ex_real", "ex_qasm", "ex_deutsch", "ex_alu", "stepDuration" ];
            disable = [ "toEnd", "next", "automatic" ];   //don't disable q_algo because the user might want to add lines to the end
            break;

        case STATE_SIMULATING:
            enable = [];
            disable = [ "sim_drop_zone", "sim_q_algo", "toStart", "prev", "automatic", "next", "toEnd", "toLine",
                        "ex_real", "ex_qasm", "ex_deutsch", "ex_alu", "stepDuration" ];
            break;

        case STATE_DIASHOW:
            runDia = true;
            pauseDia = false;
            automatic.text("||");   //\u23F8
            enable = [ "automatic" ];
            disable = [ "sim_drop_zone", "sim_q_algo", "toStart", "prev", "next", "toEnd", "toLine",
                        "ex_real", "ex_qasm", "ex_deutsch", "ex_alu", "stepDuration" ];
            break;
    }

    _enableElementsWithID(enable);
    _disableElementsWithID(disable);
}

function _enableElementsWithID(ids) {
    ids.forEach((id) => {
        const elem = document.getElementById(id);
        elem.disabled = false;
    });
}

function _disableElementsWithID(ids) {
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

window.addEventListener('resize', (event) => algoArea.updateSizes());

function validateStepDuration() {
    const input = step_duration.val();
    if(input.includes(".") || input.includes(",")) {
        showError("Floats are not allowed!\nPlease enter an unsigned integer instead.");
        step_duration.val(stepDuration);
    } else {
        const newVal = parseInt(input);
        if(newVal && 0 <= newVal) {
            stepDuration = newVal;
            step_duration.val(newVal);  //needs to be done because of parseInt possible Floats are cut off

        } else {
            showError("Invalid number for step-duration: Only unsigned integers allowed!");
            step_duration.val(stepDuration);
            return false;
        }
    }
}


const algoArea = new AlgoArea(algo_div, "sim", changeState, print, showError);
//append the navigation div below algoArea
algo_div.append(
  '<div id="nav_div">\n' +
    '        <button type="button" id="toStart" onclick="sim_gotoStart()">&#8606</button>\n' +
    '        <button type="button" id="prev" onclick="sim_goBack()">&#8592</button>\n' +
    '        <button type="button" id="automatic">&#9654</button>\n' +
    '        <button type="button" id="next" onclick="sim_goForward()">&#8594</button>\n' +
    '        <button type="button" id="toEnd" onclick="sim_gotoEnd()">&#8608</button>\n' +
    '\n' +
    '        <p></p>\n' +
    '        <button type="button" onclick="sim_gotoLine()" id="toLine">Go to Line</button>\n' +
    '        <input type="number" min="0" id="line_to_go" value="0" onchange="validateLineNumber()"/>\n' +
    '</div>'
);
const line_to_go = $('#line_to_go');

//algoArea.updateSizes();  //todo at this point the width of the elements hasn't been calculated so updateSizes() updates to wrong sizes!
changeState(STATE_NOTHING_LOADED);      //initial state




//################### ALGORITHM LOADING ##################################################################################################################

const emptyQasm =   "OPENQASM 2.0;\n" +
                    "include \"qelib1.inc\";\n" +
                    "\n" +
                    "qreg q[];\n" +
                    "creg c[];\n";
const emptyReal =   ".version 2.0 \n" +
                    ".numvars 0 \n" +
                    ".variables \n" +
                    ".begin \n" +
                    "\n" +
                    ".end \n";

/**Load empty QASM-Format
 *
 */
function loadQASM() {
    algoArea.resetAlgorithm();

    algoArea.algoFormat = QASM_FORMAT;
    algoArea.algo = emptyQasm;
}

/**Load empty Real-Format
 *
 */
function loadReal() {
    algoArea.resetAlgorithm();
    algoArea.algoFormat = REAL_FORMAT;
    algoArea.algo = emptyReal;
}

const deutschAlgorithm =    "OPENQASM 2.0;\n" +
                            "include \"qelib1.inc\";\n" +
                            "\n" +
                            "qreg q[2];\n" +
                            "creg c[2];\n" +
                            "\n" +
                            "x q[1];\n" +
                            "h q[0];\n" +
                            "h q[1];\n" +
                            "cx q[0],q[1];\n" +
                            "h q[0];\n";
function loadDeutsch() {
    algoArea.emptyAlgo = false;
    algoArea.algoChanged = true;

    algoArea.algoFormat = QASM_FORMAT;
    algoArea.algo = deutschAlgorithm;

    algoArea.loadAlgorithm(QASM_FORMAT, true);   //new algorithm -> new simulation
}

function loadAlu() {
    algoArea.emptyAlgo = false;
    algoArea.algoChanged = true;

    algoArea.algoFormat = QASM_FORMAT;
    algoArea.algo =
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
    ;

    algoArea.loadAlgorithm(QASM_FORMAT, true);   //new algorithm -> new simulation
}

//################### NAVIGATION ##################################################################################################################
$(() =>  {
    automatic.on('click', () => {
        function endDia() {
            pauseDia = true;
            runDia = false;

            _onErrorChangeState();  //in error-cases we also call endDia(), and in normal cases it doesn't matter that we call this function
            automatic.text("\u25B6");   //play-symbol in unicode
        }

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

                                algoArea.hlManager.increaseHighlighting();

                                const duration = performance.now() - startTime;     //calculate the duration of the API-call so the time between two steps is constant
                                setTimeout(() => func(), stepDuration - duration); //wait a bit so the current qdd can be shown to the user

                            } else endDia();
                        }
                    });
                    call.fail((res) => {
                        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

                        showResponseError(res, "Going a step ahead failed! Aborting Diashow."); //todo notify user that the diashow was aborted if res-msg is shown?
                        endDia();
                    });
                }
            };
            setTimeout(() => func(), stepDuration);
        }
    });
});

function sim_gotoStart() {
    changeState(STATE_SIMULATING);
    const call = $.ajax({
        url: '/tostart',
        contentType: 'application/json',
        success: (res) => {
            if(res.dot) {
                print(res.dot);
                algoArea.hlManager.initialHighlighting();
            }
            changeState(STATE_LOADED_START);
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        showResponseError(res, "Going back to the start failed!");
        _onErrorChangeState();
    });
}

function sim_goBack() {
    changeState(STATE_SIMULATING);
    const call = $.ajax({
        url: '/prev',
        contentType: 'application/json',
        success: (res) => {
            if(res.dot) {
                print(res.dot);
                algoArea.hlManager.decreaseHighlighting();
                if(algoArea.hlManager.highlightedLines <= 0) changeState(STATE_LOADED_START);
                else changeState(STATE_LOADED);

            } else changeState(STATE_LOADED_START); //should never reach this code because the button should be disabled when we reach the start
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        showResponseError(res, "Going a step back failed!");
        _onErrorChangeState();
    });
}

function sim_goForward() {
    changeState(STATE_SIMULATING);
    const call = $.ajax({
        url: '/next',
        contentType: 'application/json',
        success: (res) => {
            if(res.dot) {   //we haven't reached the end yet
                print(res.dot);

                algoArea.hlManager.increaseHighlighting();

                if(algoArea.hlManager.highlightedLines >= algoArea.numOfOperations) changeState(STATE_LOADED_END);
                else changeState(STATE_LOADED);

            } else changeState(STATE_LOADED_END); //should never reach this code because the button should be disabled when we reach the end
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        showResponseError(res, "Going a step ahead failed!");
        _onErrorChangeState();
    });
}

function sim_gotoEnd() {
    changeState(STATE_SIMULATING);
    const call = $.ajax({
        url: '/toend',
        contentType: 'application/json',
        success: (res) => {
            if(res.dot) {
                print(res.dot);
                algoArea.hlManager.highlightEverything();
            }
            changeState(STATE_LOADED_END);
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        showResponseError(res, "Going to the end failed!");
        _onErrorChangeState();
    });
}

function sim_gotoLine() {
    changeState(STATE_SIMULATING);
    const line = Math.min(parseInt(line_to_go.val()), algoArea.numOfOperations);
    const call = $.ajax({
        url: '/toline?line=' + line,
        contentType: 'application/json',
        success: (res) => {
            if(res.dot) {
                print(res.dot);
                algoArea.hlManager.highlightToXOps(line);
            }
            //determine our current position in the algorithm
            if(algoArea.hlManager.highlightedLines === 0) changeState(STATE_LOADED_START);
            else if(algoArea.hlManager.highlightedLines === algoArea.numOfOperations) changeState(STATE_LOADED_END);
            else changeState(STATE_LOADED);
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        showResponseError(res, "Going to line " + line + " failed!");
        _onErrorChangeState();
    });
}

function _onErrorChangeState() {
    //determine our current position in the algorithm
    if(algoArea.hlManager.highlightedLines <= 0) changeState(STATE_LOADED_START);
    else if(algoArea.hlManager.highlightedLines >= algoArea.numOfOperations) changeState(STATE_LOADED_END);
    else changeState(STATE_LOADED);
}

function validateLineNumber() {
    const lineNum = line_to_go.val();
    if(lineNum.includes(".")) {
        showError("Floats are not allowed! Only unsigned integers are valid.\n" +
            "Possible values: [0, " + algoArea.numOfOperations + "]");
        line_to_go.val(0);
    } else {
        const num = parseInt(lineNum);
        if(num || num === 0) {
            if(num < 0) {
                showError("You can't go to a negative line number!\nPossible values: [0, " + algoArea.numOfOperations + "]");
                line_to_go.val(0);
            } else if(num > algoArea.numOfOperations) {
                showError("Line #" + num + " doesn't exist!\nPossible values: [0, " + algoArea.numOfOperations + "]");
                line_to_go.val(algoArea.numOfOperations);
            }
        } else {
            showError("Your input is not a number!\n" +
                "Please enter an unsigned integer of the interval [0, " + algoArea.numOfOperations + "].");
            line_to_go.val(0);
        }
    }
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

let svgHeight = 0;  //can't be initialized beforehand
function print(dot) {
    if(dot) {
        if(svgHeight === 0) {
            //subtract the whole height of the qdd-text from the height of qdd-div to get the space that is available for the graph
            svgHeight = parseInt($('#qdd_div').css('height')) - (
                parseInt(parseInt(qdd_text.css('height'))) + parseInt(qdd_text.css('margin-top')) + parseInt(qdd_text.css('margin-bottom'))    //height of the qdd-text
            );
        }

        const graph = d3.select("#qdd_div").graphviz({
            width: "70%",     //make it smaller so we have space around where we can scroll through the page - also the graphs are more high than wide so is shouldn't be a problem
            height: svgHeight,
            fit: true           //automatically zooms to fill the height (or width, but usually the graphs more high then wide)
        }).renderDot(dot);

    } else {
        qdd_div.html(qdd_text);
    }
}

