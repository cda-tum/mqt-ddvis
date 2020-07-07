
const ver1_algo_div = $('#ver1_algo_div');
const ver2_algo_div = $('#ver2_algo_div');
const ver_qdd_text = $('#ver_qdd_text');
const ver_qdd_div = $('#ver_qdd_div');

const ver_graphviz = d3.select("#ver_qdd_div").graphviz({
    width: "70%",     //make it smaller so we have space around where we can scroll through the page
    fit: true           //automatically zooms to fill the height (or width, but usually the graphs more high then wide)
}).tweenPaths(true).tweenShapes(true);


function ver_changeState(state) {
    console.log("Verification changed state to " + state);
}

let ver_svgHeight = 0;
function ver_print(dd, callback, resetZoom=false) {
    console.log("Verification should print " + dd);

    if(dd) {
        //document.getElementById('color_map').style.display = 'block';
        if(ver_svgHeight === 0) {
            //subtract the whole height of the qdd-text from the height of qdd-div to get the space that is available for the graph
            ver_svgHeight = parseInt(ver_qdd_div.css('height')) - (
                parseInt(ver_qdd_text.css('height')) + parseInt(ver_qdd_text.css('margin-top')) + parseInt(ver_qdd_text.css('margin-bottom'))    //height of the qdd-text
            );
            //ver_svgHeight = 300;    //todo remove, just for testing
        }

        let animationDuration = 500;
        if(stepDuration < 1000) animationDuration = stepDuration / 2;   //todo different for sim and ver?

        if(resetZoom) {
            ver_graphviz.options({ zoomScaleExtent: [minZoomScaleExtent, maxZoomScaleExtent] })
                .height(ver_svgHeight)
                .transition(() => d3.transition().ease(d3.easeLinear).duration(animationDuration))
                .renderDot(dd).on("transitionStart", callback)
                .resetZoom();
        } else {
            ver_graphviz.options({ zoomScaleExtent: [minZoomScaleExtent, maxZoomScaleExtent] })
                .height(ver_svgHeight)
                .transition(() => d3.transition().ease(d3.easeLinear).duration(animationDuration))
                .fit(true)
                .renderDot(dd).on("transitionStart", callback);
        }


        //$('#color_map').html(
        //    '<svg><rect width="20" height="20" fill="purple"></rect></svg>'
        //);

    } else {
        ver_qdd_div.html(ver_qdd_text);
        //document.getElementById('color_map').style.display = 'none';
    }

    endLoadingAnimation();  //todo must be in callback
}

const ver1_algoArea = new AlgoArea(ver1_algo_div, "ver1", ver_changeState, ver_print, showError);
const ver2_algoArea = new AlgoArea(ver2_algo_div, "ver2", ver_changeState, ver_print, showError);

registerAlgoArea("ver1", ver1_algoArea);
registerAlgoArea("ver2", ver2_algoArea);

//append the navigation divs below the algoAreas
ver1_algo_div.append(
    '<div id="ver1_nav_div" class="nav-div">\n' +
    '        <button type="button" id="ver1_toStart" class="nav-button" onclick="gotoStart()" ' +
    'title="Go back to the initial state"' +
    '        >&#8606</button>\n' +
    '        <button type="button" id="ver1_prev" class="nav-button" onclick="goBack()" ' +
    'title="Go to the previous operation"' +
    '        >&#8592</button>\n' +
    '        <button type="button" id="ver1_automatic" class="nav-button" onclick="diashow()" ' +
    'title="Start a diashow"' +
    '        >&#9654</button>\n' +
    '        <button type="button" id="ver1_next" class="nav-button" onclick="goForward()" ' +
    'title="Apply the current operation"' +
    '        >&#8594</button>\n' +
    '        <button type="button" id="ver1_toEnd" class="nav-button" onclick="gotoEnd()" ' +
    'title="Apply all remaining operations"' +
    '        >&#8608</button>\n' +
    //'        <p></p>\n' +
    //'        <button type="button" id="ver1_toLine" onclick="sim_gotoLine()">Go to line</button>\n' +
    //'        <input type="number" id="ver1_line_to_go" min="0" value="0" onchange="validateLineNumber()"/>\n' +
    '</div>'
);
ver2_algo_div.append(
    '<div id="ver2_nav_div" class="nav-div">\n' +
    '        <button type="button" id="ver2_toStart" class="nav-button" onclick="gotoStart()" ' +
    'title="Go back to the initial state"' +
    '        >&#8606</button>\n' +
    '        <button type="button" id="ver2_prev" class="nav-button" onclick="goBack()" ' +
    'title="Go to the previous operation"' +
    '        >&#8592</button>\n' +
    '        <button type="button" id="ver2_automatic" class="nav-button" onclick="diashow()" ' +
    'title="Start a diashow"' +
    '        >&#9654</button>\n' +
    '        <button type="button" id="ver2_next" class="nav-button" onclick="goForward()" ' +
    'title="Apply the current operation"' +
    '        >&#8594</button>\n' +
    '        <button type="button" id="ver2_toEnd" class="nav-button" onclick="gotoEnd()" ' +
    'title="Apply all remaining operations"' +
    '        >&#8608</button>\n' +
    //'        <p></p>\n' +
    //'        <button type="button" id="ver2_toLine" onclick="sim_gotoLine()">Go to line</button>\n' +
    //'        <input type="number" id="ver2_line_to_go" min="0" value="0" onchange="validateLineNumber()"/>\n' +
    '</div>'
);

function gotoStart() {

}

function goBack() {

}

function diashow() {

}

function goForward() {

}

function gotoEnd() {

}
