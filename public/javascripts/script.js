
const stepWaitTime = 700;   //in ms

//from: https://www.w3schools.com/howto/tryit.asp?filename=tryhow_js_tabs
function openTab(event, tabId) {
    var i, tabcontent, tablinks;
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

$(() =>  {
    /* ######################################################### */
    $('#init').on('click', () => {
        debugText();
        
        $.ajax({
            url: '/init',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);

                var q_algo = $('#q_algo');
                q_algo.val(res.algo);
            }
        });
    });
    /* ######################################################### */
    $('#addBell').on('click', () => {
        debugText();
        
        $.ajax({
            url: '/addBell',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);
                
                var q_algo = $('#q_algo');
                q_algo.val(res.algo);
            }
        });
    });
    /* ######################################################### */
    $('#print').on('click', () => {
        var op = $('#output');
        op.text("");
        
        $.ajax({
            url: '/print',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);
                print(res.ip);
            }
        });
    });
    
    /* ######################################################### */
    $('#load').on('click', () => {
        var op = $('#output');
        op.text("");
        var q_algo = $('#q_algo').val();
        
        $.post("/load", { algo: q_algo }, 
            (res) => {
                debugText(res.msg);
                print(res.ip);
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
                    
                    if(res.reload == "true") {
                        print(res.ip);
                        setTimeout(() => func(), stepWaitTime); //wait a bit so the current qdd can be shown to the user
                    }
                }
            });
        };
        setTimeout(() => func(), stepWaitTime);     //not really needed but I think it looks better if the first transition isn't immediate but at the same pace as the others
    });
    /* ######################################################### */
    $('#prev').on('click', () => {
        debugText();

        $.ajax({
            url: '/prev',
            contentType: 'application/json',
            success: (res) => {
                debugText(res.msg);
                
                if(res.reload == "true") print(res.ip);
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
                
                if(res.reload == "true") print(res.ip);
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
                    
                    if(res.reload == "true") {
                        print(res.ip);
                        setTimeout(() => func(), stepWaitTime); //wait a bit so the current qdd can be shown to the user
                    }
                }
            });
        };
        setTimeout(() => func(), stepWaitTime);     //not really needed but I think it looks better if the first transition isn't immediate but at the same pace as the others
    });
});

function ipToFile(ip) {
    return "./data/" + ip + ".dot.svg";
}

function print(ip) {
    const img = $('#qdd_img');
    img.attr("data", ipToFile(ip));
}

function debugText(text = "") {
    const op = $('#output');
    op.text(text);
}