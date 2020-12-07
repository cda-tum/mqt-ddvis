
const ver1_algo_div = $('#ver1_algo_div');
const ver2_algo_div = $('#ver2_algo_div');
const ver_qdd_text = $('#ver_qdd_text');
const ver_qdd_div = $('#ver_qdd_div');

const ver_graphviz = d3.select("#ver_qdd_div").graphviz({
    width: "70%",     //make it smaller so we have space around where we can scroll through the page
    fit: true           //automatically zooms to fill the height (or width, but usually the graphs more high then wide)
}).tweenPaths(true).tweenShapes(true);

// ######################### STATE MANAGEMENT ##################################
let ver1RunDia = false;
let ver1State = STATE_NOTHING_LOADED;
let ver2RunDia = false;
let ver2State = STATE_NOTHING_LOADED;

/**Changes the state of the verification-UI by properly enabling and disabling certain UI elements.
 *
 * @param state the state we want to switch to
 * @param algo1 whether the state changes for the left (true) or right (false) algoDiv
 */
function ver_changeState(state, algo1=true) {
    //normally this outer if shouldn't be needed since if one algo is in SIMULATING or DIASHOW, the user
    // can't interact with the other one so it shouldn't be able to change its state
    if(algo1) {
        //if we were previously in a state that affected the other algo_div and are now no longer in this
        // state (should be always the case since SIM doesn't go to SIM etc.), we need to re-enable the
        // UI-elements of the other algo_div according to its state
        if( ver1State === STATE_SIMULATING && state !== STATE_SIMULATING ||
            ver1State === STATE_DIASHOW && state !== STATE_DIASHOW) {
            ver1State = state;
            ver_changeState(ver2State, false);      //todo are recursive endless-loops possible?

        } else ver1State = state;
    } else {
        //if we were previously in a state that affected the other algo_div and are now no longer in this
        // state (should be always the case since SIM doesn't go to SIM etc.), we need to re-enable the
        // UI-elements of the other algo_div according to its state
        if( ver2State === STATE_SIMULATING && state !== STATE_SIMULATING ||
            ver2State === STATE_DIASHOW && state !== STATE_DIASHOW) {
            ver2State = state;
            ver_changeState(ver1State, true);      //todo are recursive endless-loops possible?

        } else ver2State = state;
    }

    _ver_generalChangeState(ver1State, ver2State);  //changes the state for the tab-unrelated UI elements

    let enableWithPrefix = [];
    let enableNoPrefix = [];
    let disableWithPrefix = [];
    let disableNoPrefix = [];
    //the prefix ("ver1_" or "ver2_") are added later
    switch (state) {
        case STATE_NOTHING_LOADED:      //no navigation
            enableWithPrefix = [
                "drop_zone", "q_algo"
            ];
            disableWithPrefix = [ "toStart", "prev", "automatic", "next", "toEnd" ];
            break;

        case STATE_LOADED:
            enableWithPrefix = [
                "drop_zone", "q_algo",
                "toStart", "prev", "automatic", "next", "toEnd"
            ];
            disableWithPrefix = [  ];
            break;

        case STATE_LOADED_START:
            enableWithPrefix = [
                "drop_zone", "q_algo",
                "automatic", "next", "toEnd"
            ];
            disableWithPrefix = [ "toStart", "prev" ];
            break;

        case STATE_LOADED_END:
            enableWithPrefix = [
                "drop_zone", "q_algo",
                "toStart", "prev"
            ];
            disableWithPrefix = [ "toEnd", "next", "automatic" ];   //don't disable q_algo because the user might want to add lines to the end
            break;

        case STATE_SIMULATING:      //also affects the other algo_div
            enableNoPrefix =  [];
            disableNoPrefix = [
                "ver1_toStart", "ver1_prev", "ver1_automatic", "ver1_next", "ver1_toEnd", //navigation
                "ver2_toStart", "ver2_prev", "ver2_automatic", "ver2_next", "ver2_toEnd", //navigation
            ];
            //in firefox my onScroll-event is ignored if sim_q_algo is disabled, so for firefox things must be
            // handled differently and enable it
            if(isFirefox) {
                enableNoPrefix.push("ver1_drop_zone");
                enableNoPrefix.push("ver1_q_algo");
                enableNoPrefix.push("ver2_drop_zone");
                enableNoPrefix.push("ver2_q_algo");
            } else {
                disableNoPrefix.push("ver1_drop_zone");
                disableNoPrefix.push("ver1_q_algo");
                disableNoPrefix.push("ver2_drop_zone");
                disableNoPrefix.push("ver2_q_algo");
            }
            break;

        case STATE_DIASHOW:     //also affects the other algo_div
            enableWithPrefix = [ "automatic" ];
            disableNoPrefix = [
                "ver1_toStart", "ver1_prev", "ver1_next", "ver1_toEnd", //navigation
                "ver2_toStart", "ver2_prev", "ver2_next", "ver2_toEnd", //navigation
            ];
            //in firefox my onScroll-event is ignored if sim_q_algo is disabled, so for firefox things must be handled
            // differently and enable it
            if(isFirefox) {
                enableNoPrefix.push("ver1_drop_zone");
                enableNoPrefix.push("ver1_q_algo");
                enableNoPrefix.push("ver2_drop_zone");
                enableNoPrefix.push("ver2_q_algo");
            } else {
                disableNoPrefix.push("ver1_drop_zone");
                disableNoPrefix.push("ver1_q_algo");
                disableNoPrefix.push("ver2_drop_zone");
                disableNoPrefix.push("ver2_q_algo");
            }

            if(algo1) {
                ver1RunDia = true;
                ver1_automatic.text("||");   //\u23F8
                disableNoPrefix.push("ver2_automatic"); //disable the other dia-button
            } else {
                ver2RunDia = true;
                ver2_automatic.text("||");   //\u23F8
                disableNoPrefix.push("ver1_automatic"); //disable the other dia-button
            }

            break;

        case STATE_LOADED_EMPTY:    //no navigation allowed (we are at the beginning AND at the end)
            enableWithPrefix = [
                "drop_zone", "q_algo"
            ];
            disableWithPrefix = [ "toStart", "prev", "automatic", "next", "toEnd" ];
            break;
    }

    const idPrefix = algo1 ? "ver1_" : "ver2_";
    const enable = [];
    enableWithPrefix.forEach(v => enable.push(idPrefix + v));
    enableNoPrefix.forEach(v => enable.push(v));
    const disable = [];
    disableWithPrefix.forEach(v => disable.push(idPrefix + v));
    disableNoPrefix.forEach(v => disable.push(v));

    enableElementsWithID(enable);
    disableElementsWithID(disable);
}

function _ver_generalChangeState(state1, state2) {
    //while one state is simulating, the user must not interact with the server
    if(state1 === STATE_SIMULATING || state2 === STATE_SIMULATING)  {
        generalChangeState(STATE_SIMULATING);
        return;
    }

    //while one state is in diashow, the user must not interact with the server
    if(state1 === STATE_DIASHOW || state2 === STATE_DIASHOW) {
        generalChangeState(STATE_DIASHOW);
        return;
    }

    //since no state is in SIMULATING or DIASHOW, we are in a LOADED state, and (right now) they
    // all just enable the general elements
    generalChangeState(STATE_LOADED);   //doesn't matter which one we choose
}

function _ver_generalStateChange(algo1) {
    endLoadingAnimation();

    if(algo1) {
        //determine our current position in the algorithm
        if(ver1_algoArea.hlManager.highlightedLines <= 0)
            ver_changeState(STATE_LOADED_START, algo1);
        else if(ver1_algoArea.hlManager.highlightedLines >= ver1_algoArea.numOfOperations)
            ver_changeState(STATE_LOADED_END, algo1);
        else
            ver_changeState(STATE_LOADED, algo1);

    } else {
        //determine our current position in the algorithm
        if(ver2_algoArea.hlManager.highlightedLines <= 0)
            ver_changeState(STATE_LOADED_START, algo1);
        else if(ver2_algoArea.hlManager.highlightedLines >= ver2_algoArea.numOfOperations)
            ver_changeState(STATE_LOADED_END, algo1);
        else
            ver_changeState(STATE_LOADED, algo1);
    }
}

/**ver1_algoAreaChangeState
 *
 * @param state
 */
function ver1_aacs(state) {
    ver_changeState(state, true);
}
/**ver1_algoAreaChangeState
 *
 * @param state
 */
function ver2_aacs(state) {
    ver_changeState(state, false);
}

let ver_svgHeight = 0;
function ver_print(dd, callback, resetZoom=false) {
    if(dd) {
        if(ver_svgHeight === 0) {
            //subtract the whole height of the qdd-text from the height of qdd-div to get the space that is available for the graph
            ver_svgHeight = parseInt(ver_qdd_div.css('height')) - (
                parseInt(ver_qdd_text.css('height')) + parseInt(ver_qdd_text.css('margin-top')) + parseInt(ver_qdd_text.css('margin-bottom'))    //height of the qdd-text
            );
        }

        let animationDuration = 500;
        if(stepDuration < 1000) animationDuration = stepDuration / 2;   //todo different for sim and ver?

        if(resetZoom && ver_graphviz._zoomSelection) {
            ver_graphviz.options({ zoomScaleExtent: [minZoomScaleExtent, maxZoomScaleExtent] })
                .height(ver_svgHeight)
                .transition(() => d3.transition().ease(d3.easeLinear).duration(animationDuration))
                .renderDot(dd).on("transitionStart", callback)
                .resetZoom(d3.transition("smooth")
                    .duration(animationDuration)
                    .ease(d3.easeLinear));
        } else {
            ver_graphviz.options({ zoomScaleExtent: [minZoomScaleExtent, maxZoomScaleExtent] })
                .height(ver_svgHeight)
                .transition(() => d3.transition().ease(d3.easeLinear).duration(animationDuration))
                .renderDot(dd).on("transitionStart", callback);
        }

    } else {
        ver_qdd_div.html(ver_qdd_text);
        if(callback) callback();
    }
}

function ver_onAlgoReset() {
    function reset(algo1) {
        const call = $.post("reset", { targetManager: "ver", algo1: algo1, dataKey: dataKey });
        call.done((res) => {
            //console.log("unready worked");
        });
        call.fail(res => {
            if(res.status === 404) {
                if(res.responseJSON && res.responseJSON.msg) showError(res.responseJSON.msg);
                else showError("Error 404");
                window.location.reload(false);//404 means that we are no longer registered and therefore need to reload

            } else if(res.status === 500) {
                if(res.responseJSON && res.responseJSON.msg) showError(res.responseJSON.msg);
                else showError("Internal Server Error");

            } else {
                if(algo1)   ver1_onLoadError(res.responseJSON.msg);
                else        ver2_onLoadError(res.responseJSON.msg);
            }
        });
    }

    if(ver1_algoArea.emptyAlgo && ver2_algoArea.emptyAlgo) {
        //both are empty so we reset the displayed DD
        ver_print(null, () => {
            reset(true);
            reset(false);
            ver_changeState(STATE_NOTHING_LOADED, true);
            ver_changeState(STATE_NOTHING_LOADED, false);
        });

    } else if(ver1_algoArea.emptyAlgo) {
        ver_gotoStart(true, () => {    //reset algo1
            reset(true);
            //and then "force" the state to NOTHING_LOADED
            ver_changeState(STATE_NOTHING_LOADED, true);
        });

    } else if(ver2_algoArea.emptyAlgo) {
        ver_gotoStart(false, () => {    //reset algo2
            reset(false);
            //and then "force" the state to NOTHING_LOADED
            ver_changeState(STATE_NOTHING_LOADED, false);
        });
    }
}

/**Is called from an algoArea when the numbers of qubits of the algos don't match.
 *
 * @param algo1 {boolean}
 * @param msg {string} the error message
 */
function ver_onLoadError(algo1, msg) {
    showError(msg);

    if(algo1)   ver1_algoArea.resetAlgorithm(false);
    else        ver2_algoArea.resetAlgorithm(false);
}

function ver1_onLoadError(msg) {
    ver_onLoadError(true, msg);
}
function ver2_onLoadError(msg) {
    ver_onLoadError(false, msg);
}

const ver1_algoArea = new AlgoArea(ver1_algo_div, VER1_ID_PREFIX, ver1_aacs, ver_print, showError, ver_onAlgoReset,
    ver1_onLoadError, { targetManager: "ver", algo1: true }
);
const ver2_algoArea = new AlgoArea(ver2_algo_div, VER2_ID_PREFIX, ver2_aacs, ver_print, showError, ver_onAlgoReset,
    ver2_onLoadError, { targetManager: "ver", algo1: false }
);

registerAlgoArea(VER1_ID_PREFIX, ver1_algoArea);
registerAlgoArea(VER2_ID_PREFIX, ver2_algoArea);

//append the navigation divs below the algoAreas
ver1_algo_div.append(
    '<div id="ver1_nav_div" class="nav-div">\n' +
    '        <button type="button" id="ver1_toStart" class="nav-button" onclick="ver_gotoStart(true)" ' +
    'title="Go back to the initial state"' +
    '        >&#8606</button>\n' +
    '        <button type="button" id="ver1_prev" class="nav-button" onclick="ver_goBack(true)" ' +
    'title="Go to the previous operation"' +
    '        >&#8592</button>\n' +
    '        <button type="button" id="ver1_automatic" class="nav-button" onclick="ver_diashow(true)" ' +
    'title="Start a diashow"' +
    '        >&#9654</button>\n' +
    '        <button type="button" id="ver1_next" class="nav-button" onclick="ver_goForward(true)" ' +
    'title="Apply the current operation"' +
    '        >&#8594</button>\n' +
    '        <button type="button" id="ver1_toEnd" class="nav-button" onclick="ver_gotoEnd(true)" ' +
    'title="Apply all remaining operations"' +
    '        >&#8608</button>\n' +
    //'        <p></p>\n' +
    //'        <button type="button" id="ver1_toLine" onclick="sim_gotoLine()">Go to line</button>\n' +
    //'        <input type="number" id="ver1_line_to_go" min="0" value="0" onchange="validateLineNumber()"/>\n' +
    '</div>'
);
ver2_algo_div.append(
    '<div id="ver2_nav_div" class="nav-div">\n' +
    '        <button type="button" id="ver2_toStart" class="nav-button" onclick="ver_gotoStart(false)" ' +
    'title="Go back to the initial state"' +
    '        >&#8606</button>\n' +
    '        <button type="button" id="ver2_prev" class="nav-button" onclick="ver_goBack(false)" ' +
    'title="Go to the previous operation"' +
    '        >&#8592</button>\n' +
    '        <button type="button" id="ver2_automatic" class="nav-button" onclick="ver_diashow(false)" ' +
    'title="Start a diashow"' +
    '        >&#9654</button>\n' +
    '        <button type="button" id="ver2_next" class="nav-button" onclick="ver_goForward(false)" ' +
    'title="Apply the current operation"' +
    '        >&#8594</button>\n' +
    '        <button type="button" id="ver2_toEnd" class="nav-button" onclick="ver_gotoEnd(false)" ' +
    'title="Apply all remaining operations"' +
    '        >&#8608</button>\n' +
    //'        <p></p>\n' +
    //'        <button type="button" id="ver2_toLine" onclick="sim_gotoLine()">Go to line</button>\n' +
    //'        <input type="number" id="ver2_line_to_go" min="0" value="0" onchange="validateLineNumber()"/>\n' +
    '</div>'
);

const ver1_automatic = $('#ver1_automatic');
const ver2_automatic = $('#ver2_automatic');

//prepare the initial state
ver_changeState(STATE_NOTHING_LOADED, true);
ver_changeState(STATE_NOTHING_LOADED, false);

// ###################### SETTINGS INTERACTIONS ###############################################

/**
 *
 * @param algo {string} the algorithm to load
 * @param format {number} the format of the algorithm
 * @param algo1 {boolean} whether we load it as algo1 (left) or algo2 (right)
 */
function ver_loadExAlgo(algo, format, algo1) {
    if(algo1) {
        ver1_algoArea.emptyAlgo = false;
        ver1_algoArea.algoChanged = true;
        ver1_algoArea.algoFormat = format;
        ver1_algoArea.algo = algo;

        ver1_algoArea.loadAlgorithm(format, true);   //new algorithm -> new simulation

    } else {
        ver2_algoArea.emptyAlgo = false;
        ver2_algoArea.algoChanged = true;
        ver2_algoArea.algoFormat = format;
        ver2_algoArea.algo = algo;

        ver2_algoArea.loadAlgorithm(format, true);   //new algorithm -> new simulation
    }
}

/**Updates the export options for the simulation-dd
 *
 * @param colored whether the edges should be colored based on their weight or be black and dotted/thick
 * @param edgeLabels whether the weights should be displayed as labels on the edges or not
 * @param classic whether a node should be a rounded-rectangle or a classical circle
 */
function ver_updateExportOptions(colored, edgeLabels, classic) {
    const lastState1 = ver1State;
    const lastState2 = ver2State;
    ver_changeState(STATE_SIMULATING, true);
    ver_changeState(STATE_SIMULATING, false);
    startLoadingAnimation();

    const callback = () => {
        endLoadingAnimation();
        ver_changeState(lastState1, true); //go back to the previous state
        ver_changeState(lastState2, false); //go back to the previous state
    }

    const updateDD = !ver1_algoArea.emptyAlgo || !ver2_algoArea.emptyAlgo;  //check if at least one algorithm is loaded
    const call = jQuery.ajax({
        type: 'PUT',
        url: 'updateExportOptions',
        data: { colored: colored, edgeLabels: edgeLabels, classic: classic,
            updateDD: updateDD, dataKey: dataKey, targetManager: "ver" },
        success: (res) => {
            if (res.dot) ver_print(res.dot, callback);
            else callback();
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload

        endLoadingAnimation();
        showResponseError(res, "");
        _ver_generalStateChange(true);
        _ver_generalStateChange(false);
    });
}

// ##################### NAVIGATION #######################################################

/**
 *
 * @param algo1
 * @param callback needed if we go back to the start because the algorithm was reset
 */
function ver_gotoStart(algo1, callback) {
    ver_changeState(STATE_SIMULATING, algo1);
    startLoadingAnimation();

    const call = $.ajax({
        url: 'tostart?dataKey=' + dataKey + '&targetManager=ver&algo1=' + algo1,
        contentType: 'application/json',
        success: (res) => {
            if(res.dot) {
                ver_print(res.dot, () => {
                    if(algo1)   ver1_algoArea.hlManager.initialHighlighting();
                    else        ver2_algoArea.hlManager.initialHighlighting();
                    endLoadingAnimation();
                    ver_changeState(STATE_LOADED_START, algo1);
                    if(callback) {
                        callback();
                    }
                }, true);
            } else {
                endLoadingAnimation();
                ver_changeState(STATE_LOADED_START, algo1);
            }
        }
    });
    call.fail((res) => {
        if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload
        showResponseError(res, "Going back to the start failed!");
        _ver_generalStateChange(algo1);
    });
}

function ver_goBack(algo1) {
    ver_changeState(STATE_SIMULATING, algo1);
    startLoadingAnimation();

    const call = $.ajax({
        url: 'prev?dataKey=' + dataKey + '&targetManager=ver&algo1=' + algo1,
        contentType: 'application/json',
        success: (res) => {
            if(res.dot) {
                ver_print(res.dot, () => {
                    if(algo1)   ver1_algoArea.hlManager.decreaseHighlighting();
                    else        ver2_algoArea.hlManager.decreaseHighlighting();

                    _ver_generalStateChange(algo1);
                });
            } else {
                _ver_generalStateChange(algo1);
            } //should never reach this code because the button should be disabled when we reach the start
        }
    });
    call.fail((res) => {
        //404 means that we are no longer registered and therefore need to reload
        if(res.status === 404) window.location.reload(false);

        showResponseError(res, "Going a step back for " + (algo1 ? "algo1" : "algo2") + " failed!");
        //_generalStateChange();
    });
}

function ver_diashow(algo1) {
    /**Convenience function to avoid code duplication. Simply sets everything that is needed to properly stop the diashow.
     *
     */
    function endDia() {
        if(algo1) {
            ver1RunDia = false;
            _ver_generalStateChange(true);  //in error-cases we also call endDia(), and in normal cases it doesn't matter that we call this function
            ver1_automatic.text("\u25B6");   //play-symbol in unicode
        } else {
            ver2RunDia = false;
            _ver_generalStateChange(false);  //in error-cases we also call endDia(), and in normal cases it doesn't matter that we call this function
            ver2_automatic.text("\u25B6");   //play-symbol in unicode
        }
    }

    /**Periodically calls /next and updates DD if necessary
     *
     */
    const func = () => {
        if(algo1 && ver1RunDia || !algo1 && ver2RunDia) {
            const startTime = performance.now();
            const call = $.ajax({
                url: 'next?dataKey=' + dataKey + '&targetManager=ver&algo1=' + algo1,
                contentType: 'application/json',
                success: (res) => {
                    if(res.dot) {
                        ver_print(res.dot, () => {
                            if(algo1)   ver1_algoArea.hlManager.increaseHighlighting();
                            else        ver2_algoArea.hlManager.increaseHighlighting();
                            //calculate the duration of the API-call so the time between two steps is constant
                            const duration = performance.now() - startTime;
                            if (res.data.nextIsIrreversible) {
                                endDia();
                                ver_changeState(STATE_LOADED_END, algo1)
                            } else {
                                //wait a bit so the current qdd can be shown to the user
                                setTimeout(() => func(), Math.min(Math.abs(stepDuration - duration), stepDuration));
                            }
                        });

                    } else {
                        endDia();
                    }
                }
            });
            call.fail((res) => {
                //404 means that we are no longer registered and therefore need to reload
                if(res.status === 404) window.location.reload(false);

                if(res.responseJSON && res.responseJSON.msg) showError(res.responseJSON.msg + "\nAborting diashow.");
                else if(altMsg) showError("Going a step ahead failed! Aborting diashow.");
                endDia();
            });
        }
    };

    if(algo1 && ver1RunDia || !algo1 && ver2RunDia) endDia();
    else {
        if(algo1)   ver1RunDia = true;
        else        ver2RunDia = true;
        ver_changeState(STATE_DIASHOW, algo1);
        setTimeout(() => func(), stepDuration);
    }
}

function ver_goForward(algo1) {
    ver_changeState(STATE_SIMULATING, algo1);
    startLoadingAnimation();

    const call = $.ajax({
        url: 'next?dataKey=' + dataKey + '&targetManager=ver&algo1=' + algo1,
        contentType: 'application/json',
        success: (res) => {

            let disableGoingForward = res.data.nextIsIrreversible;
            if(algo1)   ver1_algoArea.hlManager.increaseHighlighting();
            else        ver2_algoArea.hlManager.increaseHighlighting();

            function callback() {
                _ver_generalStateChange(algo1);
                if (disableGoingForward) {
                    ver_changeState(STATE_LOADED_END, algo1);
                }
            }

            if(res.dot) {   //we haven't reached the end yet
                ver_print(res.dot, callback);
            }
        }
    });
    call.fail((res) => {
        //404 means that we are no longer registered and therefore need to reload
        if(res.status === 404) window.location.reload(false);

        showResponseError(res, "Going a step ahead for " + (algo1 ? "algo1" : "algo2") + " failed!");
        _ver_generalStateChange(algo1);
    });
}

function ver_gotoEnd(algo1) {
    ver_changeState(STATE_SIMULATING, algo1);
    startLoadingAnimation();

    const call = $.ajax({
        url: 'toend?dataKey=' + dataKey + '&targetManager=ver&algo1=' + algo1,
        contentType: 'application/json',
        success: (res) => {
            function stateChange(res, algo1) {
                endLoadingAnimation();
                if (res.data.nextIsIrreversible) {
                    ver_changeState(STATE_LOADED_END, algo1);
                } else if (res.data.barrier) {
                    ver_changeState(STATE_LOADED, algo1);
                } else {
                    ver_changeState(STATE_LOADED_END, algo1);
                }
            }

            if(res.dot) {
                ver_print(res.dot, () => {
                    // increase highlighting by the number of applied operations
                    area = algo1? ver1_algoArea: ver2_algoArea;
                    if (res.data.barrier) {
                        area.hlManager.highlightToXOps(area.hlManager.highlightedLines + res.data.nops);
                    } else if (res.data.nextIsIrreversible) {
                        area.hlManager.highlightToXOps(area.hlManager.highlightedLines + res.data.nops);
                    } else {
                        area.hlManager.highlightEverything();
                    }
                    stateChange(res, algo1);
                });
            } else {
                stateChange(res, algo1);
            }
        }
    });
    call.fail((res) => {
        //404 means that we are no longer registered and therefore need to reload
        if(res.status === 404) window.location.reload(false);

        showResponseError(res, "Going to the end failed!");
        _ver_generalStateChange();
    });
}

//+ '&targetManager=ver&algo1=' + algo1
