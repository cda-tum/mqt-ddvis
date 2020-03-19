
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
