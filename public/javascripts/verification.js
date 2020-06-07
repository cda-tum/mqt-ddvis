
const ver1_algo_div = $('#ver1_algo_div');
const ver2_algo_div = $('#ver2_algo_div');

function ver_changeState(state) {
    console.log("Verification changed state to " + state);
}

function ver_print(dd) {
    console.log("Verification should print " + dd);
}

const ver_algoArea1 = new AlgoArea(ver1_algo_div, "ver1", ver_changeState, print, showError);
const ver_algoArea2 = new AlgoArea(ver2_algo_div, "ver2", ver_changeState, print, showError);
