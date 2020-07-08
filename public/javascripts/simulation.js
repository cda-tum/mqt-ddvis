
//################### J-QUERY ELEMENTS ###############################################################################################################

const algo_div = $('#algo_div');
const qdd_div = $('#qdd_div');
const qdd_text = $('#qdd_text');

//todo put these into main.js
const step_duration = $('#stepDuration');
const cb_colored = $('#cb_colored');
const cb_edge_labels = $('#cb_edge_labels');
const cb_classic = $('#cb_classic');

const irreversibleDialog = $("#irreversibleDialog");

const graphviz = d3.select("#qdd_div").graphviz({
    width: "70%",     //make it smaller so we have space around where we can scroll through the page
    fit: true           //automatically zooms to fill the height (or width, but usually the graphs more high then wide)
}).tweenPaths(true).tweenShapes(true);

//################### CONFIGURATION ##################################################################################################################

let stepDuration = 1000;   //in ms


//################### STATE MANAGEMENT ##################################################################################################################

let runDia = false;
let conductedIrreversibleOperation = false;
let simState = STATE_NOTHING_LOADED;

/**Changes the state of the simulation-UI by properly enabling disabling certain UI elements.
 *
 * @param state the state we want to switch to
 */
function changeState(state) {
    generalChangeState(state);  //changes the state for the tab-unrelated UI elements
    let enable;
    let disable;
    switch (state) {
        case STATE_NOTHING_LOADED:      //no navigation
            enable = [
                "sim_drop_zone", "sim_q_algo"
            ];
            disable = [ "toStart", "prev", "automatic", "next", "toEnd", "toLine" ];
            break;

        case STATE_LOADED:
            enable = [
                "sim_drop_zone", "sim_q_algo",
                "toStart", "prev", "automatic", "next", "toEnd", "toLine"
            ];
            disable = [  ];
            break;

        case STATE_LOADED_START:
            enable = [
                "sim_drop_zone", "sim_q_algo",
                "automatic", "next", "toEnd", "toLine"
            ];
            disable = [ "toStart", "prev" ];
            break;

        case STATE_LOADED_END:
            enable = [
                "sim_drop_zone", "sim_q_algo",
                "toStart", "prev", "toLine",
            ];
            disable = [ "toEnd", "next", "automatic" ];   //don't disable q_algo because the user might want to add lines to the end
            break;

        case STATE_SIMULATING:
            enable =  [];
            disable = [
                "toStart", "prev", "automatic", "next", "toEnd", "toLine",      //navigation buttons
            ];
            //in firefox my onScroll-event is ignored if sim_q_algo is disabled, so for firefox things must be handled differently and enable it
            if(isFirefox) {
                enable.push("sim_drop_zone");
                enable.push("sim_q_algo");
            } else {
                disable.push("sim_drop_zone");
                disable.push("sim_q_algo");
            }
            break;

        case STATE_DIASHOW:
            runDia = true;
            automatic.text("||");   //\u23F8
            enable = [ "automatic" ];
            disable = [
                "toStart", "prev", "next", "toEnd", "toLine",
            ];
            //in firefox my onScroll-event is ignored if sim_q_algo is disabled, so for firefox things must be handled differently and enable it
            if(isFirefox) {
                enable.push("sim_drop_zone");
                enable.push("sim_q_algo");
            } else {
                disable.push("sim_drop_zone");
                disable.push("sim_q_algo");
            }

            break;

        case STATE_LOADED_EMPTY:    //no navigation allowed (we are at the beginning AND at the end)
            enable = [ "sim_drop_zone", "sim_q_algo"
            ];
            disable = [ "toStart", "prev", "automatic", "next", "toEnd", "toLine" ];
            break;
    }

    enableElementsWithID(enable);
    disableElementsWithID(disable);

    simState = state;
}

//################### UI INITIALIZATION ##################################################################################################################
//accordion
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


const algoArea = new AlgoArea(algo_div, "sim", changeState, print, showError);
registerAlgoArea("sim", algoArea);  //register at main for resizing

//append the navigation div below algoArea
algo_div.append(
  '<div id="nav_div" class="nav-div">\n' +
    '        <button type="button" id="toStart" class="nav-button" onclick="sim_gotoStart()" ' +
    'title="Go back to the initial state"' +
    '        >&#8606</button>\n' +
    '        <button type="button" id="prev" class="nav-button" onclick="sim_goBack()" ' +
    'title="Go to the previous operation"' +
    '        >&#8592</button>\n' +
    '        <button type="button" id="automatic" class="nav-button" onclick="sim_diashow()" ' +
    'title="Start a diashow"' +
    '        >&#9654</button>\n' +
    '        <button type="button" id="next" class="nav-button" onclick="sim_goForward()" ' +
    'title="Apply the current operation"' +
    '        >&#8594</button>\n' +
    '        <button type="button" id="toEnd" class="nav-button" onclick="sim_gotoEnd()" ' +
    'title="Apply all remaining operations"' +
    '        >&#8608</button>\n' +
    '        <p></p>\n' +
    '        <button type="button" id="toLine" onclick="sim_gotoLine()">Go to line</button>\n' +
    '        <input type="number" id="line_to_go" min="0" value="0" onchange="validateLineNumber()"/>\n' +
    '</div>'
);
const line_to_go = $('#line_to_go');    //must be created here since it doesn't exist before
const automatic = $('#automatic');

//if enter is pressed inside line_to_go, we go to the stated line
line_to_go.keyup((event) => {
    if(line_to_go.is(":focus") && event.key === "Enter") {
        sim_gotoLine();
    }
});

changeState(STATE_NOTHING_LOADED);      //prepare initial state


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

/**Load Deutsch-algorithm
 *
 */
function loadDeutsch() {
    algoArea.emptyAlgo = false;
    algoArea.algoChanged = true;

    algoArea.algoFormat = QASM_FORMAT;
    algoArea.algo = "OPENQASM 2.0;\n" +
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

    algoArea.loadAlgorithm(QASM_FORMAT, true);   //new algorithm -> new simulation
}

/**Load Alu-algorithm
 *
 */
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
/**Sets the simulation back to its initial state by calling /tostart and updates the DD if necessary.
 *
 */
function sim_gotoStart() {
    changeState(STATE_SIMULATING);
    startLoadingAnimation();

    const call = $.ajax({
        url: '/tostart?dataKey=' + dataKey,
        contentType: 'application/json',
        success: (res) => {
            if(res.dot) {
                print(res.dot, () => {
                    algoArea.hlManager.initialHighlighting();
                    endLoadingAnimation();
                    changeState(STATE_LOADED_START);
                });
            } else {
                endLoadingAnimation();
                changeState(STATE_LOADED_START);
            }
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload
        showResponseError(res, "Going back to the start failed!");
        _generalStateChange();
    });
}

/**Goes one step back in the simulation by calling /prev and updates the DD if necessary.
 *
 */
function sim_goBack() {
    changeState(STATE_SIMULATING);
    startLoadingAnimation();

    const call = $.ajax({
        url: '/prev?dataKey=' + dataKey,
        contentType: 'application/json',
        success: (res) => {
            if(res.dot) {
                print(res.dot, () => {
                    algoArea.hlManager.decreaseHighlighting();

                    endLoadingAnimation();
                    if(algoArea.hlManager.highlightedLines <= 0) changeState(STATE_LOADED_START);
                    else changeState(STATE_LOADED);
                    // disable the back button in case the previous operation now is a non-reversible operation
                    if (res.data.noGoingBack) {
                        const elem = document.getElementById("prev");
                        elem.disabled = true;
                    }
                });
            } else {
                endLoadingAnimation();
                changeState(STATE_LOADED_START);
            } //should never reach this code because the button should be disabled when we reach the start
        }
    });
    call.fail((res) => {
        //404 means that we are no longer registered and therefore need to reload
        if(res.status === 404) window.location.reload(false);

        showResponseError(res, "Going a step back failed!");
        _generalStateChange();
    });
}

/**Either starts or stops the diashow. While a diashow is running the client periodically (defined by stepDuration) calls
 * /next and updates the DD until the end of the algorithm is reached or the diashow is stopped manually.
 *
 */
function sim_diashow() {
    /**Convenience function to avoid code duplication. Simply sets everything that is needed to properly stop the diashow.
     *
     */
    function endDia(disableBackButton) {
        runDia = false;
        _generalStateChange();  //in error-cases we also call endDia(), and in normal cases it doesn't matter that we call this function
        automatic.text("\u25B6");   //play-symbol in unicode
        if (disableBackButton) {
            document.getElementById("prev").disabled = true;
        }
    }
    if(runDia) endDia(conductedIrreversibleOperation);
    else {
        runDia = true;
        changeState(STATE_DIASHOW);
        /**Periodically calls /next and updates DD if necessary
         *
         */
        const func = () => {
            if(runDia) {
                const startTime = performance.now();
                const call = $.ajax({
                    url: '/next?dataKey=' + dataKey,
                    contentType: 'application/json',
                    success: (res) => {

                        function diaCallback() {
                            algoArea.hlManager.increaseHighlighting();
                            //calculate the duration of the API-call so the time between two steps is constant
                            const duration = performance.now() - startTime;
                            //wait a bit so the current qdd can be shown to the user
                            setTimeout(() => func(), Math.min(Math.abs(stepDuration - duration), stepDuration));
                        }

                        if (typeof res.data !== 'undefined'  && res.data.conductIrreversibleOperation) {
                            conductedIrreversibleOperation = true;
                            _handleIrreversibleOperation(res.data, function (result) {
                                // only conduct callback, when last operation finished
                                if (!result.finished && result.dot) print(result.dot, null);
                                else if (result.dot) print(result.dot, diaCallback());
                            });
                        } else if(res.dot) {   //we haven't reached the end yet
                            conductedIrreversibleOperation = false;
                            print(res.dot, diaCallback());
                        } else {
                            endDia(conductedIrreversibleOperation);
                        }
                    }
                });
                call.fail((res) => {
                    if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

                    if(res.responseJSON && res.responseJSON.msg) showError(res.responseJSON.msg + "\nAborting diashow.");
                    else if(altMsg) showError("Going a step ahead failed! Aborting diashow.");
                    endDia(conductedIrreversibleOperation);
                });
            }
        };
        setTimeout(() => func(), stepDuration);
    }
}

/**Goes one step forward in the simulation by calling /next and updates the DD if necessary.
 *
 */
function sim_goForward() {
    changeState(STATE_SIMULATING);
    startLoadingAnimation();

    const call = $.ajax({
        url: '/next?dataKey=' + dataKey,// + '&targetManager=sim',
        contentType: 'application/json',
        success: (res) => {
            let disableBackButton = res.data.conductIrreversibleOperation;
            let disablePlayAndToEndButton = res.data.nextIsIrreversible;

            algoArea.hlManager.increaseHighlighting();

            function callback() {
                _generalStateChange();
                // disable the back button in case a measurement was conducted
                if (disableBackButton) {
                    document.getElementById("prev").disabled = true;
                }
                if (disablePlayAndToEndButton) {
                    document.getElementById("toEnd").disabled = true;
                }
            }

            if (res.data.conductIrreversibleOperation) {
                _handleIrreversibleOperation(res.data, function (result) {
                    // only conduct callback, when last operation finished
                    if (!result.finished && result.dot) print(result.dot, null);
                    else if (result.dot) print(result.dot, callback);
                });
            } else if(res.dot) {   //we haven't reached the end yet
                print(res.dot, callback);
            }
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        showResponseError(res, "Going a step ahead failed!");
        _generalStateChange();
    });
}

/**Simulates to the end of the algorithm by calling /toend and updates the DD if necessary.
 *
 */
function sim_gotoEnd() {
    changeState(STATE_SIMULATING);
    startLoadingAnimation();

    const call = $.ajax({
        url: '/toend?dataKey=' + dataKey,
        contentType: 'application/json',
        success: (res) => {
            function stateChange(res) {
                endLoadingAnimation();
                if (res.data.nextIsIrreversible) {
                    changeState(STATE_LOADED);
                    document.getElementById("toEnd").disabled = true;
                } else if (res.data.barrier) changeState(STATE_LOADED);
                else changeState(STATE_LOADED_END);
            }

            if(res.dot) {
                print(res.dot, () => {
                    // increase highlighting by the number of applied operations
                    if (res.data.barrier) {
                        algoArea.hlManager.highlightToXOps(algoArea.hlManager.highlightedLines + res.data.nops);
                    } else if (res.data.nextIsIrreversible) {
                        algoArea.hlManager.highlightToXOps(algoArea.hlManager.highlightedLines + res.data.nops);
                    } else {
                        algoArea.hlManager.highlightEverything();
                    }
                    stateChange(res);
                });
            } else {
                stateChange(res);
            }

        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        showResponseError(res, "Going to the end failed!");
        _generalStateChange();
    });
}

/**Simulates to the given line by calling /toline and updates the DD if necessary.
 *
 */
function sim_gotoLine() {
    changeState(STATE_SIMULATING);
    startLoadingAnimation();

    //the user is not allowed to go to a line that is not in the algorithm
    let line = parseInt(line_to_go.val());
    if(line > algoArea.numOfOperations) {
        line = algoArea.numOfOperations;
        line_to_go.val(line);
    }
    const call = $.ajax({
        url: '/toline?line=' + line + '&dataKey=' + dataKey,
        contentType: 'application/json',
        success: (res) => {
            function stateChange(res) {
                _generalStateChange();
                endLoadingAnimation();
                if (res.data.nextIsIrreversible) {
                    document.getElementById("toEnd").disabled = true;
                }
                if (res.data.noGoingBack) {
                    document.getElementById("prev").disabled = true;
                }
            }

            if(res.dot) {
                print(res.dot, () => {
                    if (res.data.noGoingBack) {
                        if (res.data.reset) algoArea.hlManager.highlightToXOps(res.data.nops);
                        else algoArea.hlManager.highlightToXOps(algoArea.hlManager.highlightedLines - res.data.nops);
                    } else if (res.data.nextIsIrreversible) {
                        if (res.data.reset) algoArea.hlManager.highlightToXOps(res.data.nops);
                        else algoArea.hlManager.highlightToXOps(algoArea.hlManager.highlightedLines + res.data.nops);
                    } else {
                        if (res.data.reset) algoArea.hlManager.highlightToXOps(res.data.nops);
                        else algoArea.hlManager.highlightToXOps(line);
                    }
                    stateChange(res);
                });
            } else {
                stateChange(res);
            }
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        showResponseError(res, "Going to line " + line + " failed!");
        _generalStateChange();
    });
}

/**If we don't know which states are possible (for example on error), we call this function since it covers all possible
 * states after a simulation step.
 *
 * @private
 */
function _generalStateChange() {
    endLoadingAnimation();

    //determine our current position in the algorithm
    if(algoArea.hlManager.highlightedLines <= 0) changeState(STATE_LOADED_START);
    else if(algoArea.hlManager.highlightedLines >= algoArea.numOfOperations) changeState(STATE_LOADED_END);
    else changeState(STATE_LOADED);
}

function _resizeDialog(dialog, pzero, pone) {
    $(window).resize(function() {
        if (dialog.hasClass("ui-dialog-content") &&
            dialog.dialog("isOpen")) {
            dialog.dialog("option", "position", {my: "center", at: "center", of: "#algo_div"});
            dialog.dialog("option", "width", $(window).width() * 0.15);
            let dialogWidth = dialog.innerWidth();
            let buttonpane = dialog.next();
            buttonpane.find('button:first').width(pzero * dialogWidth * 0.75);
            buttonpane.find('button:last').width(pone * dialogWidth * 0.75);
        }
    });
}

function _startDialog(dialog, title, text, pzero, pone) {
    dialog.html(text);
    const def = $.Deferred();

    _resizeDialog(dialog, pzero, pone);
    dialog.dialog({
        title: title,
        resizable: false,
        autoOpen: true,
        modal: true,
        position: {my: "center", at: "center", of: "#algo_div"},
        width: $(window).width() * 0.15,
        buttons: {
            'Option 0': {id: 'm0', text: '0', click: function() {
                    def.resolve("0");
                    $( this ).dialog( "close" );
                }},
            'Option 1': {id: 'm1', text: '1', click: function() {
                    def.resolve("1");
                    $( this ).dialog( "close" );
                }},
        },
        close: function() {
            def.resolve("none")
            $(this).dialog('destroy');
        }
    });
    let buttonpane = dialog.next();
    buttonpane.find('button:first').width(pzero * dialog.innerWidth() * 0.75);
    buttonpane.find('button:last').width(pone * dialog.innerWidth() * 0.75);
    return def.promise();
}

function _handleIrreversibleOperation(data, callback) {
    let parameter = data.parameter;

    const qubit = parameter.qubit;
    const pzero = parameter.pzero;
    const pone = parameter.pone;

    if (pzero < 1e-13 || pone < 1e-13) {
        if (pzero < 1e-13) parameter['classicalValueToMeasure'] = "1";
        else parameter['classicalValueToMeasure'] = "0";
        _makeIrreversibleOperationCall(parameter, callback);
        return;
    }
    // user decision on what to do based on information above
    let title;
    let text;
    if (typeof parameter.cbit !== 'undefined') {
        title = 'Measuring qubit q' + qubit;
        text = "Decide the measurement outcome<br><div>p(0)=" + pzero.toFixed(2) +
            "</div><div>p(1)=" + pone.toFixed(2) + "</div>";
    } else {
        title = 'Resetting qubit q' + qubit;
        text = "Decide the reset outcome<br><div>p(0)=" + pzero.toFixed(2) +
            "</div><div>p(1)=" + pone.toFixed(2) + "</div>";
    }

    _startDialog(irreversibleDialog, title, text, pzero, pone).done(function(status) {
        parameter['classicalValueToMeasure'] = status;
        _makeIrreversibleOperationCall(parameter, callback);
    }).fail(function () {
        // possibly handle error here
    });
}

function _makeIrreversibleOperationCall(parameter, callback) {
    const call = $.ajax({
        url: '/conductIrreversibleOperation?dataKey=' + dataKey,
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: {parameter: JSON.stringify(parameter)},
        success: (response) => {
            if (!response.finished) {
                callback(response);
                _handleIrreversibleOperation(response, callback);
            } else {
                callback(response);
            }
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload
        showResponseError(res, "Conducting irreversible operation failed.");
        _generalStateChange();
    });
}

/**Checks if the number the user entered in line_to_go is an integer between 0 and numOfOperations. If this is not the
 * case an error is shown and the value is reset.
 *
 */
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
//moved to main.js

//$( document ).ajaxError(function( event, request, settings ) {
//    showError( "Unhandled error occured! Error requesting page " + settings.url);
//});



//################### MISC ##################################################################################################################

const minZoomScaleExtent = 0.1;     //defines the farthest a user can zoom out of a DD
const maxZoomScaleExtent = 100;     //defines the farthest a user can zoom into a DD
let svgHeight = 0;  //can't be initialized beforehand
/**Visualizes the given DD as d3 graph with a transition animation.
 *
 * @param dot a string representing a DD in the .dot-format
 *          if not given, the graph will be reset (no DD visualized)
 * @param callback function that is executed when rendering finishes
 * @param resetZoom whether the DD should be recentered with fitting zoom or not
 */
function print(dot, callback, resetZoom=false) {
    if(dot) {
        //document.getElementById('color_map').style.display = 'block';
        if(svgHeight === 0) {
            //subtract the whole height of the qdd-text from the height of qdd-div to get the space that is available for the graph
            svgHeight = parseInt(qdd_div.css('height')) - (
                parseInt(qdd_text.css('height')) + parseInt(qdd_text.css('margin-top')) + parseInt(qdd_text.css('margin-bottom'))    //height of the qdd-text
            );
        }

        let animationDuration = 500;
        if(stepDuration < 1000) animationDuration = stepDuration / 2;

        if(resetZoom) {
            graphviz.options({ zoomScaleExtent: [minZoomScaleExtent, maxZoomScaleExtent] })
                .height(svgHeight)
                .transition(() => d3.transition().ease(d3.easeLinear).duration(animationDuration))
                .renderDot(dot).on("transitionStart", callback)
                .resetZoom();
        } else {
            graphviz.options({ zoomScaleExtent: [minZoomScaleExtent, maxZoomScaleExtent] })
                .height(svgHeight)
                .transition(() => d3.transition().ease(d3.easeLinear).duration(animationDuration))
                .fit(true)
                .renderDot(dot).on("transitionStart", callback);
        }


        //$('#color_map').html(
        //    '<svg><rect width="20" height="20" fill="purple"></rect></svg>'
        //);

    } else {
        qdd_div.html(qdd_text);
        //document.getElementById('color_map').style.display = 'none';
    }
}

/**Checks if the number the user entered in step_duration is an integer > 0. If this is not the
 * case an error is shown and the value is reset to the previous value.
 *
 */
function validateStepDuration() {
    const input = step_duration.val();
    if(input.includes(".") || input.includes(",")) {
        showError("Floats are not allowed!\nPlease enter an unsigned integer instead.");
        step_duration.val(stepDuration);
    } else {
        const newVal = parseInt(input);
        if(0 <= newVal) {
            stepDuration = newVal;
            step_duration.val(newVal);  //needs to be done because of parseInt possible Floats are cut off

        } else {
            showError("Invalid number for step-duration: Only unsigned integers allowed!");
            step_duration.val(stepDuration);
        }
    }
}

/**Updates the export options that define some visual properties of the DD by calling /updateExportOptions and udpating
 * the DD if necessary.
 *
 */
function updateExportOptions() {
    const colored = cb_colored.prop('checked');
    const edgeLabels = cb_edge_labels.prop('checked');
    const classic = cb_classic.prop('checked');

    const lastState = simState;
    changeState(STATE_SIMULATING);
    startLoadingAnimation();

    const call = jQuery.ajax({
        type: 'PUT',
        url: '/updateExportOptions',
        data: { colored: colored, edgeLabels: edgeLabels, classic: classic, updateDD: !algoArea.emptyAlgo, dataKey: dataKey },
        success: (res) => {
            if (res.dot) print(res.dot, () => {
                endLoadingAnimation();
                changeState(lastState); //go back to the previous state
            });
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        endLoadingAnimation();
        showResponseError(res, "");
        _generalStateChange();
    });
}
