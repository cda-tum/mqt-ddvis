
const ver1_algo_div = $('#ver1_algo_div');
const ver2_algo_div = $('#ver2_algo_div');

function ver_changeState(state) {
    console.log("Verification changed state to " + state);
}

function ver_print(dd, callback, reset) {
    console.log("Verification should print " + dd);
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
