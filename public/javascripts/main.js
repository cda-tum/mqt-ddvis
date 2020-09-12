//for browser specific things, check which browser is used
// Firefox 1.0+
const isFirefox = typeof InstallTrigger !== 'undefined';

/*
// Opera 8.0+
//const isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;


// Safari 3.0+ "[object HTMLElementConstructor]"
//const isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification));

// Internet Explorer 6-11*/
//const isIE = /*@cc_on!@*/false || !!document.documentMode;
/*
// Edge 20+
//const isEdge = !isIE && !!window.StyleMedia;

// Chrome 1 - 79
//const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

// Edge (based on chromium) detection
//const isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") != -1);

// Blink engine detection
//const isBlink = (isChrome || isOpera) && !!window.CSS;
*/


//register at the server as soon as main.js is loaded
const mainCall =  $.post("/register", {  });
let dataKey = "";   //save the dataKey for later needed access to the QDDVis-object
mainCall.done((res) => {
    dataKey = res.key;
    //console.log("Your dataKey: " + dataKey);
});
mainCall.fail((res) => {
    showError("Something bad has happened. Please reload the page!");
});


// ################### TAB_MANAGEMENT ################################################
const SIM_ID_PREFIX = "sim";
const VER1_ID_PREFIX = "ver1";
const VER2_ID_PREFIX = "ver2";

const START_TAB = 0;
const SIM_TAB = 1;
const VER_TAB = 2;
let curTab = START_TAB;
//todo on tab change certain things need to be done:
/*
    - "kill" the current simulation/verification/emulation process
    - maybe reset the tab-data?
 */
//from: https://www.w3schools.com/howto/tryit.asp?filename=tryhow_js_tabs
function openTab(tabId) {
    //deactivate all tabs
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    //deactivate all tab-buttons
    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    //open the selected tab and activate its button
    const tab = document.getElementById(tabId + '_sec');
    tab.style.display = "block";
    const tab_button = document.getElementById(tabId + '_tab');
    tab_button.className += " active";

    onTabChange(tabId);
    updateAllAlgoAreaSizes();
    //this would be a more efficient approach, but since we just have a couple of algoAreas it shouldn't matter
    //if(tabId === "simulation") {
    //    algoAreas.get("sim").updateSizes();
    //}
}

function onTabChange(newTab) {
    const oldTab = curTab;

    function setExportOptions(targetManager) {
        //set the checkboxes of the export options to their correct values
        const call = $.ajax({
            url: '/getExportOptions?dataKey=' + dataKey + '&targetManager=' + targetManager,
            contentType: 'application/json',
            success: (res) => {
                if(res) {
                    cb_colored.checked = res.colored ? 'checked' : '';
                    cb_edge_labels.checked = res.edgeLabels ? 'checked' : '';
                    cb_classic.checked = res.classic ? 'checked' : '';

                } else {
                    //endLoadingAnimation();
                    //changeState(STATE_LOADED_START);
                }
            }
        });
        call.fail((res) => {
            //if(res.status === 404) window.location.reload(false);   //404 means that we are no longer registered and therefore need to reload
            showResponseError(res, "Getting the updateOptions of sim failed!");
            //_generalStateChange();
        });
    }

    switch (newTab) {
        case "sim": curTab = SIM_TAB;

                    ex_algo_ver_loading.style.height = "0"; //hide it
                    reset_btn.textContent = "Reset Algorithm";
                    reset_btn.style.display = "block";

                    enableElementsWithID([ "cb_colored", "cb_edge_labels", "cb_classic" ]);
                    disableElementsWithID([ "radio_algo1", "radio_algo2" ]);
                    setExportOptions("sim");
                    break;

        case "ver": curTab = VER_TAB;

                    ex_algo_ver_loading.style.height = "60px";
                    reset_btn.textContent = "Reset Algorithms";
                    reset_btn.style.display = "block";

                    enableElementsWithID([
                        "radio_algo1", "radio_algo2",
                        "cb_colored", "cb_edge_labels", "cb_classic"
                    ]);
                    setExportOptions("ver");
                    break;

        default:    curTab = START_TAB;

                    ex_algo_ver_loading.style.height = "0"; //hide it
                    reset_btn.style.display = "none";

                    disableElementsWithID([
                        "radio_algo1", "radio_algo2",
                        "cb_colored", "cb_edge_labels", "cb_classic"
                    ]);
    }

    if(oldTab === START_TAB && curTab !== START_TAB) {
        //settings_menu.style.display = "block";
        settings_menu.style.width = "15%";
        main_content.style.width = "85%";

    } else if(curTab === START_TAB && oldTab !== START_TAB) {
        //settings_menu.style.display = "none";
        settings_menu.style.width = "0";
        main_content.style.width = "100%";
    }
}



// ################ EXAMPLE ALGOS ###########################################

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function exAlgoDropDown() {
    document.getElementById("ex_algo_dropdown").classList.toggle("show");
}

function exAlgoFilterFunction() {
    const input = document.getElementById("ex_algo_search_text");
    const filter = input.value.toUpperCase();
    const a = ex_algo_list.getElementsByTagName("button");
    for (let i = 0; i < a.length; i++) {
        const txtValue = a[i].textContent || a[i].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            a[i].style.display = "";
        } else {
            a[i].style.display = "none";
        }
    }
}

//init example algorithms of the dropdown
const call = $.ajax({
    url: '/exampleAlgos',
    contentType: 'application/json',
    success: (res) => {
        if(res) {
            const ex_algo_dd = ex_algo_list;//document.getElementById('ex_algo_dropdown');
            res.forEach(name => {
                const button = document.createElement("button");
                button.innerText = name;
                button.className = "example-algo";
                button.onclick = () => loadExampleAlgo(name);
                ex_algo_dd.appendChild(button);
            });
        } else {
            //todo reload?
        }
    }
});
call.fail((res) => showResponseError(res, "Loading example algorithms failed!"));


const emptyReal =   ".version 2.0 \n" +
    ".numvars 0 \n" +
    ".variables \n" +
    ".begin \n" +
    "\n" +
    ".end \n";
const emptyQasm =   "OPENQASM 2.0;\n" +
    "include \"qelib1.inc\";\n" +
    "\n" +
    "qreg q[];\n" +
    "creg c[];\n";

function loadEmptyReal() {
    if(curTab === START_TAB) return;

    if(curTab === SIM_TAB) {
        algoArea.resetAlgorithm();
        algoArea.algoFormat = REAL_FORMAT;
        algoArea.algo = emptyReal;

    } else if(curTab === VER_TAB) {
        const algo1 = document.getElementById("radio_algo1").checked;
        if(algo1) {
            ver1_algoArea.resetAlgorithm();
            ver1_algoArea.algoFormat = REAL_FORMAT;
            ver1_algoArea.algo = emptyReal;
        } else {
            ver2_algoArea.resetAlgorithm();
            ver2_algoArea.algoFormat = REAL_FORMAT;
            ver2_algoArea.algo = emptyReal;
        }
    }
}

function loadEmptyQasm() {
    if(curTab === START_TAB) return;

    if(curTab === SIM_TAB) {
        algoArea.resetAlgorithm();
        algoArea.algoFormat = QASM_FORMAT;
        algoArea.algo = emptyQasm;

    } else if(curTab === VER_TAB) {
        const algo1 = document.getElementById("radio_algo1").checked;
        if(algo1) {
            ver1_algoArea.resetAlgorithm();
            ver1_algoArea.algoFormat = QASM_FORMAT;
            ver1_algoArea.algo = emptyQasm;
        } else {
            ver2_algoArea.resetAlgorithm();
            ver2_algoArea.algoFormat = QASM_FORMAT;
            ver2_algoArea.algo = emptyQasm;
        }
    }
}

function loadExampleAlgo(name) {
    if(curTab === START_TAB) return;

    const call = $.ajax({
        url: '/exampleAlgo?name=' + name,
        contentType: 'application/json',
        success: (res) => {
            if(res) {
                if(curTab === SIM_TAB) {
                    sim_loadExAlgo(res.algo, res.format);

                } else if(curTab === VER_TAB) {
                    const algo1 = document.getElementById("radio_algo1").checked;
                    ver_loadExAlgo(res.algo, res.format, algo1);
                }

            } else {
                //todo reload?
                console.log("Error?");
            }
        }
    });
    call.fail((res) => {
        showResponseError(res, "Loading " + name + " failed!");
    });
}

// ###################### ADVANCED SETTINGS ######################################
//step_duration and checkboxes are initialized in init.js
let stepDuration = 1000;   //in ms

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
    if(curTab === START_TAB) return;

    const colored = cb_colored.checked;
    const edgeLabels = cb_edge_labels.checked;
    const classic = cb_classic.checked;
    //console.log(colored + ", " + edgeLabels + ", " + classic);

    if(curTab === SIM_TAB) {
        sim_updateExportOptions(colored, edgeLabels, classic);

    } else if(curTab === VER_TAB) {
        ver_updateExportOptions(colored, edgeLabels, classic);
    }
}


//####################### STATE MANAGEMENT ######################################
const STATE_NOTHING_LOADED = 0;     //initial state, goes to LOADED
const STATE_LOADED = 1;             //can go to SIMULATING and DIASHOW, both of them can lead to LOADED (somewhere between start and end)
const STATE_LOADED_START = 2;       //can go to SIMULATING, DIASHOW, LOADED or LOADED_END
const STATE_LOADED_END = 3;         //can go to LOADED or LOADED_START
const STATE_SIMULATING = 4;         //can go to LOADED
const STATE_DIASHOW = 5;            //can go to LOADED
const STATE_LOADED_EMPTY = 6;       //can't navigate

const _generalElements = [
    "sim_tab", "ver_tab",
    "stepDuration", "cb_colored", "cb_edge_labels", "cb_classic"
];
function generalChangeState(state) {
    switch (state) {
        case STATE_NOTHING_LOADED:
        case STATE_LOADED:
        case STATE_LOADED_START:
        case STATE_LOADED_END:
        case STATE_LOADED_EMPTY:
            if(curTab === VER_TAB) enableElementsWithID([ "radio_algo1", "radio_algo2" ]);

            //enable all example-algos (buttons)
            const ea_enable = document.getElementsByClassName("example-algo");
            for(let i = 0; i < ea_enable.length; i++) ea_enable[i].disabled = false;

            enableElementsWithID(_generalElements);
            if(curTab === START_TAB) disableElementsWithID([ "cb_colored", "cb_edge_labels", "cb_classic" ]);
            break;

        case STATE_SIMULATING:
        case STATE_DIASHOW:
            //disabling doesn't make a difference, but seems more consistent with the other UI elements
            if(curTab === VER_TAB) disableElementsWithID([ "radio_algo1", "radio_algo2" ]);

            //disable all example-algos (buttons)
            const ea_disable = document.getElementsByClassName("example-algo");
            for(let i = 0; i < ea_disable.length; i++) ea_disable[i].disabled = true;

            disableElementsWithID(_generalElements);
            break;
    }
}

/**Enables all elements whose id is mentioned in the parameter.
 *
 * @param ids string-array with the ids of all elements that should be enabled
 * @private
 */
function enableElementsWithID(ids) {
    ids.forEach((id) => {
        const elem = document.getElementById(id);
        if(!elem) console.log(id);
        elem.disabled = false;
    });
}

/**Disables all elements whose id is mentioned in the parameter.
 *
 * @param ids string-array with the ids of all elements that should be disabled
 * @private
 */
function disableElementsWithID(ids) {
    ids.forEach((id) => {
        const elem = document.getElementById(id);
        if(!elem) console.log(id);
        elem.disabled = true;
    });
}


// ##################### DRAG & DROP ##############################

const dropListeners = new Map();

/**Registers the listener with the given prefix as key in a map that forwards drop-events to its entries.
 *
 * @param idPrefix the listener-function only is called when the target of the drop has this id
 * @param listener function that is called when the drop's target has the given id
 */
function registerDropListener(idPrefix, listener) {
    dropListeners.set(idPrefix, listener);
}
//we need a global dropHandler because otherwise the event is different and doesn't provide the needed data (dropped files)
function dropHandler(event) {
    event.preventDefault();     //prevents the browser from opening the file and therefore leaving the website

    const target = event.target.id;
    for(const listener of dropListeners.entries()) {
        const idPrefix = listener[0];
        //call the listener if the event affected its target
        if(target.startsWith(idPrefix)) {
            //prevent the drop to work on disabled elements
            if(!event.target.disabled) listener[1].handleDrop(event);
        }
    }
}

function dragOverHandler(event) {
    event.preventDefault(); //needed for all q_algos
}




//##################### ERRORS ########################################

/**Shows the message contained in the response or an alternative message as error to the client.
 *
 * @param res response of a call to the server
 * @param altMsg alternative message if the response contains no message
 */
function showResponseError(res, altMsg) {
    if(res.responseJSON && res.responseJSON.msg) showError(res.responseJSON.msg);
    else if(altMsg) showError(altMsg);
    else showError("Response error without a defined message!");
}

/**Shows the client an error message as alert.
 *
 * @param error {string} the error message to show
 */
function showError(error) {
    alert(error);
}


// ################### LOADING ANIMATION ###########################################

function startLoadingAnimation() {
    document.getElementById('loader').style.display = 'block';
}

function endLoadingAnimation() {
    document.getElementById('loader').style.display = 'none';
}


// ################## ALGO AREAS #########################################

const algoAreas = new Map();    //stores algoAreas for resizing on window resize-events

/**Registers the given algoArea for size-updates on window resize-events.
 *
 * @param idPrefix {string} unique key to identify the algoArea (though not needed at the moment)
 * @param algoArea {AlgoArea} an algoArea that will be resized if the window size changes
 */
function registerAlgoArea(idPrefix, algoArea) {
    algoAreas.set(idPrefix, algoArea);
}

/**All AlgoArea-instances need to update their size if the window size changes.
 *
 */
function updateAllAlgoAreaSizes() {
    for(const area of algoAreas.values()) area.updateSizes();
}
window.addEventListener('resize', (event) => {
    updateAllAlgoAreaSizes();
});

function resetAlgorithm() {
    if(curTab === START_TAB) return;

    if(curTab === SIM_TAB) {
        algoAreas.get(SIM_ID_PREFIX).resetAlgorithm(true);

    } else if(curTab === VER_TAB) {
        algoAreas.get(VER1_ID_PREFIX).resetAlgorithm(true);
        algoAreas.get(VER2_ID_PREFIX).resetAlgorithm(true);
        ver_onAlgoReset();  //call it after both algorithms were reset (hence applyCallback is false)
    }
}
