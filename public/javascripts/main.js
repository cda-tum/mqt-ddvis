

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
}

function showResponseError(res, altMsg = "Unknown Error!") {
    if(res.responseJSON && res.responseJSON.msg) showError(res.responseJSON.msg);
    else showError(altMsg);
}

function showError(error) {
    alert(error);
}


function startLoadingAnimation() {
    document.getElementById('loader').style.display = 'block';
}

function endLoadingAnimation() {
    document.getElementById('loader').style.display = 'none';
}


const dropListeners = new Map();

/**
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
        if(target.startsWith(idPrefix)) listener[1].handleDrop(event);
    }
}

function dragOverHandler(event) {
    event.preventDefault(); //needed for all q_algos
}


const algoAreas = [];
window.addEventListener('resize', (event) => {
    for(const area of algoAreas) area.updateSizes();
});
