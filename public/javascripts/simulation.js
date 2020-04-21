//states of the simulation tab
const STATE_NOTHING_LOADED = 0;     //initial state, goes to LOADED
const STATE_LOADED = 1;             //can go to SIMULATING and DIASHOW, both of them can lead to LOADED
const STATE_SIMULATING = 2;         //can go to LOADED
const STATE_DIASHOW = 3;            //can go to LOADED

let runDia = false;
let pauseDia = false;
let stepDuration = 700;   //in ms

changeState(STATE_NOTHING_LOADED);      //initial state


function changeState(state) {
    let enable;
    let disable;
    runDia = false;
    pauseDia = false;
    switch (state) {
        case STATE_NOTHING_LOADED:
            enable = [];
            disable = [ "toStart", "prev", "next", "toEnd", "automatic", "stop" ];
            break;

        case STATE_LOADED:
            enable = [ "drop_zone", "q_algo", "toStart", "prev", "next", "toEnd", "automatic", "stepDuration" ];
            disable = [];
            break;

        case STATE_SIMULATING:
            enable = [];
            disable = [ "drop_zone", "q_algo", "toStart", "prev", "next", "toEnd", "automatic", "stop", "stepDuration" ];
            break;

        case STATE_DIASHOW:
            runDia = true;
            pauseDia = false;
            enable = [ "stop" ];
            disable = [ "drop_zone", "q_algo", "toStart", "prev", "next", "toEnd", "stepDuration" ];        //todo should next (maybe even toEnd) be enabled?
            break;
    }

    enableElementsWithID(enable);
    disableElementsWithID(disable);
}

function enableElementsWithID(ids) {
    ids.forEach((id) => {
        const elem = document.getElementById(id);
        elem.disabled = false;
    });
}

function disableElementsWithID(ids) {
    ids.forEach((id) => {
        const elem = document.getElementById(id);
        elem.disabled = true;
    });
}



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

function loadDeutsch() {
    const q_algo = document.getElementById("q_algo");
    q_algo.value =
        "OPENQASM 2.0;\n" +
        "include \"qelib1.inc\";\n" +
        "\n" +
        "qreg q[2];\n" +
        "creg c[2];\n" +
        "\n" +
        "x q[1];\n" +
        "h q[0];\n" +
        "h q[1];\n" +
        "cx q[0],q[1];\n" +
        "h q[0];\n"
    ;

    loadAlgorithm();
}


let basisStates = null;
/*function validate() {
    const basic_states = document.getElementById("basic_states");
    const arr = basic_states.value.split(" ");

    basicStates = [];
    arr.forEach(value => {
        const index = value.indexOf("j");
        if(0 <= value.indexOf("+")) {   //complex number
            console.log(value + " is a complex number");

            const parts = value.split("+");
            if(parts.length === 2) {

            }

        } else if(0 <= value.indexOf("-")) {   //complex number
            console.log(value + " is a complex number");


        } else if(index === 0 || index === value.length-1) {      //imaginary number
            console.log(value + " is a imaginary number");

            if(index === 0) value = value.substring(1);
            else value = value.substring(0, index);

            const num = parseFloat(value);
            if(num) basicStates.push(new Complex(0, num));
            else {
                document.getElementById("output").value = "Error! " + value + " is no float!";  //todo error
            }

        } else {            //real number
            console.log(value + " is a real number");

            const num = parseFloat(value);
            if(num) basicStates.push(new Complex(num, 0));
            else {
                document.getElementById("output").value = "Error! " + value + " is no float!";  //todo error
            }
        }
    });

    basicStates.forEach(value => console.log("bs: " + value));
}
*/
function validate() {
    $(() => {
        const basis_states = $('#basis_states').val();
        debugText();

        $.post("/validate", { basisStates: basis_states },
            (res) => {
                debugText(res.msg);
            }
        );
    });
}

//events ###############################################################################################################
function dropHandler(event) {
    event.preventDefault();     //prevents the browser from opening the file and therefore leaving the website

    if(event.dataTransfer.items) {
        for(let i = 0; i < event.dataTransfer.files.length; i++) {
            //if(event.dataTransfer.items[i].kind === 'file') {
            if(event.dataTransfer.files[i].name.endsWith(".qasm")) {
                let file = event.dataTransfer.files[i];
                let reader = new FileReader();

                reader.onload = function(e) {
                    const q_algo = document.getElementById("q_algo");
                    q_algo.value = e.target.result;

                    loadAlgorithm();
                };
                reader.readAsBinaryString(file);

            } else {
                console.log("ERROR");
                //todo show error
            }
            //}
        }
    }
}
//######################################################################################################################

$('#q_algo').highlightWithinTextarea({
    highlight: [
        {
            highlight: "Potato",
            className: "red"
        }
    ]
});

function loadAlgorithm() {
    $(() => {
        const op = $('#output');
        op.text("");

        //const basis_states = $('#basis_states').val();
        const q_algo = $('#q_algo').val();
        //console.log("Basis states: " + basis_states);
        const opNum = $('#startLine').val();

        if(q_algo) {
            $.post("/load", { basisStates: null, algo: q_algo, opNum: opNum },      //todo get opNum from user input
                (res) => {
                    debugText(res.msg);
                    print(res.svg);

                    changeState(STATE_LOADED);
                }
            );
        }
    });
}

$(() =>  {
    /* ######################################################### */
    $('#toStart').on('click', () => {
        debugText();

        updateStepDuration();

        changeState(STATE_SIMULATING);
        $.ajax({
            url: '/tostart',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);

                if(res.svg) print(res.svg);
            }
        });
        changeState(STATE_LOADED);
        /*
        const func = () => {
            const startTime = performance.now();
            $.ajax({
                url: '/prev',
                contentType: 'application/json',
                success: (res) => {
                    debugText(res.msg);

                    const duration = performance.now() - startTime;     //calculate the duration of the API-call so the time between two steps is constant
                    if(res.svg) {
                        print(res.svg);
                        setTimeout(() => func(), stepDuration - duration); //wait a bit so the current qdd can be shown to the user

                    } else changeState(STATE_LOADED);
                }
            });
        };
        setTimeout(() => func(), stepDuration/2);     //not really needed but I think it looks better if the first transition isn't immediate but at the same pace as the others
        */

    });
    /* ######################################################### */
    $('#prev').on('click', () => {
        debugText();

        changeState(STATE_SIMULATING);
        $.ajax({
            url: '/prev',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);

                if(res.svg) print(res.svg);
            }
        });
        changeState(STATE_LOADED);
    });
    /* ######################################################### */
    $('#next').on('click', () => {
        debugText();

        changeState(STATE_SIMULATING);
        $.ajax({
            url: '/next',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);

                if(res.svg) print(res.svg);
            }
        });
        changeState(STATE_LOADED);
    });
    /* ######################################################### */
    $('#toEnd').on('click', () => {
        debugText();

        updateStepDuration();

        changeState(STATE_SIMULATING);
        $.ajax({
            url: '/toend',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);

                if(res.svg) print(res.svg);
            }
        });
        changeState(STATE_LOADED);

        /*
        const func = () => {
            const startTime = performance.now();
            $.ajax({
                url: '/next',
                contentType: 'application/json',
                success: (res) => {
                    debugText(res.msg);

                    const duration = performance.now() - startTime;     //calculate the duration of the API-call so the time between two steps is constant
                    if(res.svg) {
                        print(res.svg);
                        setTimeout(() => func(), stepDuration - duration); //wait a bit so the current qdd can be shown to the user

                    } else changeState(STATE_LOADED);
                }
            });
        };
        setTimeout(() => func(), stepDuration/2);     //not really needed but I think it looks better if the first transition isn't immediate but at the same pace as the others
         */
    });
    /* ######################################################### */
    $('#automatic').on('click', () => {

        if(runDia) {
            pauseDia = true;
            runDia = false;

        } else {
            runDia = true;
            debugText();

            updateStepDuration();
            changeState(STATE_DIASHOW);


            const func = () => {
                const startTime = performance.now();
                $.ajax({
                    url: '/next',
                    contentType: 'application/json',
                    success: (res) => {
                        debugText(res.msg);

                        const duration = performance.now() - startTime;     //calculate the duration of the API-call so the time between two steps is constant
                        if(res.svg) {
                            print(res.svg);
                            if(!pauseDia) setTimeout(() => func(), stepDuration - duration); //wait a bit so the current qdd can be shown to the user

                        } else changeState(STATE_LOADED);
                    }
                    //todo what should we do on error?
                });
            };
            setTimeout(() => func(), stepDuration/2);     //not really needed but I think it looks better if the first transition isn't immediate but at the same pace as the others
        }

    });
});

function print(svg) {
    const div = document.getElementById('svg_div');
    const start = svg.indexOf('<svg');

    div.innerHTML = svg.substring(start);
}

function updateStepDuration() {
    const newVal = $("#stepDuration").val();    //update the stepDuration-value
    if(0 <= newVal) stepDuration = newVal;
}

function debugText(text = "") {
    const op = $('#output');
    op.text(text);
}
