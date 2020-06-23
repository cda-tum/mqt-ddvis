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
    document.getElementById(tabId).style.display = "block";
    event.currentTarget.className += " active";

    updateAllAlgoAreaSizes();
    //this would be a more efficient approach, but since we just have a couple of algoAreas it shouldn't matter
    //if(tabId === "simulation") {
    //    algoAreas.get("sim").updateSizes();
    //}
}




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

function startLoadingAnimation() {
    document.getElementById('loader').style.display = 'block';
}

function endLoadingAnimation() {
    document.getElementById('loader').style.display = 'none';
}


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
