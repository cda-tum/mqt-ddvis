

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
    q_algo.textContent =
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
}

function dropHandler(event) {
    event.preventDefault();

    if(event.dataTransfer.items) {
        for(let i = 0; i < event.dataTransfer.files.length; i++) {
            //if(event.dataTransfer.items[i].kind === 'file') {
            if(event.dataTransfer.files[i].name.endsWith(".qasm")) {
                let file = event.dataTransfer.files[i];
                let reader = new FileReader();

                reader.onload = function(e) {
                    const q_algo = document.getElementById("q_algo");
                    q_algo.textContent = e.target.result;
                };
                reader.readAsBinaryString(file);

            } else {
                //todo show error
            }
            //}
        }
    }
}



const stepWaitTime = 700;   //in ms

$(() =>  {
    /* ######################################################### */
    $('#load').on('click', () => {
        const op = $('#output');
        op.text("");
        const q_algo = $('#q_algo').val();

        $.post("/load", { algo: q_algo },
            (res) => {
                debugText(res.msg);
                print(res.svg);
            }
        );
    });
    /* ######################################################### */
    $('#toStart').on('click', () => {
        debugText();

        const func = () => {
            $.ajax({
                url: '/prev',
                contentType: 'application/json',
                success: (res) => {
                    debugText(res.msg);

                    if(res.svg) {
                        print(res.svg);
                        setTimeout(() => func(), stepWaitTime); //wait a bit so the current qdd can be shown to the user
                    }
                }
            });
        };
        setTimeout(() => func(), stepWaitTime/2);     //not really needed but I think it looks better if the first transition isn't immediate but at the same pace as the others
    });
    /* ######################################################### */
    $('#prev').on('click', () => {
        debugText();

        $.ajax({
            url: '/prev',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);

                if(res.svg) print(res.svg);
            }
        });
    });
    /* ######################################################### */
    $('#next').on('click', () => {
        debugText();

        $.ajax({
            url: '/next',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);

                if(res.svg) print(res.svg);
            }
        });
    });
    /* ######################################################### */
    $('#toEnd').on('click', () => {
        debugText();

        const func = () => {
            $.ajax({
                url: '/next',
                contentType: 'application/json',
                success: (res) => {
                    debugText(res.msg);

                    if(res.svg) {
                        print(res.svg);
                        setTimeout(() => func(), stepWaitTime); //wait a bit so the current qdd can be shown to the user
                    }
                }
            });
        };
        setTimeout(() => func(), stepWaitTime/2);     //not really needed but I think it looks better if the first transition isn't immediate but at the same pace as the others
    });
});

function print(svg) {
    const div = document.getElementById('svg_div');
    const start = svg.indexOf('<svg');

    div.innerHTML = svg.substring(start);
}

function debugText(text = "") {
    const op = $('#output');
    op.text(text);
}
