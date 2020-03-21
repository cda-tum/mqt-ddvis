


function dropHandler1(event) {
    event.preventDefault();

    if(event.dataTransfer.items) {
        for(let i = 0; i < event.dataTransfer.files.length; i++) {
            //if(event.dataTransfer.items[i].kind === 'file') {
            if(event.dataTransfer.files[i].name.endsWith(".qasm")) {
                let file = event.dataTransfer.files[i];

                let reader = new FileReader();
                reader.onload = function(e) {
                    const algo = document.getElementById("ver_algo1");
                    algo.textContent = e.target.result;
                };
                reader.readAsBinaryString(file);

            } else {
                //todo show error
            }
            //}
        }
    }
}


function dropHandler2(event) {
    event.preventDefault();

    if(event.dataTransfer.items) {
        for(let i = 0; i < event.dataTransfer.files.length; i++) {
            //if(event.dataTransfer.items[i].kind === 'file') {
            if(event.dataTransfer.files[i].name.endsWith(".qasm")) {
                let file = event.dataTransfer.files[i];

                let reader = new FileReader();
                reader.onload = function(e) {
                    const algo = document.getElementById("ver_algo2");
                    algo.textContent = e.target.result;
                };
                reader.readAsBinaryString(file);

            } else {
                //todo show error
            }
            //}
        }
    }
}