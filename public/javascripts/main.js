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



//todo on tab change certain things need to be done:
/*
    - "kill" the current simulation/verification/emulation process
    - maybe reset the tab-data?
 */
//from: https://www.w3schools.com/howto/tryit.asp?filename=tryhow_js_tabs
function openTab(event, tabId) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
console.log("ABSTURZ");
    const tab = document.getElementById(tabId);
    tab.style.display = "block";
    /*const tab_button = document.getElementById(tabId + '_tab');
    if(event && tab_button == event.currentTarget) {
        debugger
    } else {
        debugger
    }*/
    event.currentTarget.className += " active";

    updateAllAlgoAreaSizes();
    //this would be a more efficient approach, but since we just have a couple of algoAreas it shouldn't matter
    //if(tabId === "simulation") {
    //    algoAreas.get("sim").updateSizes();
    //}
}

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function exAlgoDropDown() {
    document.getElementById("ex_algo_dropdown").classList.toggle("show");
}

function exAlgoFilterFunction() {
    const input = document.getElementById("ex_algo_search_text");
    const filter = input.value.toUpperCase();
    const dropdown = document.getElementById("ex_algo_dropdown");
    const a = dropdown.getElementsByTagName("button");
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
            //const ex_algo_dd = $('#ex_algo_dropdown');
            const ex_algo_dd = document.getElementById('ex_algo_dropdown');
            res.forEach(name => {
                const button = document.createElement("button");
                button.innerText = name;
                button.className = "example-algo";
                button.onclick = () => loadExampleAlgo(name);
                ex_algo_dd.appendChild(button);
            });

        } else {

        }
    }
});
call.fail((res) => {
    //404 means that we are no longer registered and therefore need to reload
    if(res.status === 404) window.location.reload(false);

    showResponseError(res, "Going a step back failed!");
    _generalStateChange();
});
function loadExampleAlgo(name) {
    console.log("Loading " + name);
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
    "ex_real", "ex_qasm", "ex_deutsch", "ex_alu",
    "stepDuration", "cb_colored", "cb_edge_labels", "cb_classic"
];
function generalChangeState(state) {
    switch (state) {
        case STATE_NOTHING_LOADED:
        case STATE_LOADED:
        case STATE_LOADED_START:
        case STATE_LOADED_END:
        case STATE_LOADED_EMPTY:
            enableElementsWithID(_generalElements);
            break;

        case STATE_SIMULATING:
        case STATE_DIASHOW:
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


// ################### LOADING ###########################################

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
