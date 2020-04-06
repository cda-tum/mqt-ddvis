
const qddVis = require("../build/Release/QDD_Vis");
const express = require('express');
const router = express.Router();
const dm = require('../datamanager');
const fs = require('fs');
const Complex = require('complex.js');

/* GET home page. */
router.get('/', function(req, res, next) {
    //console.log(req.ip + " has entered (index.js)");
    //dm.register(req);
    //res.render('index', { title: 'QDD Visualizer' });
});

router.post('/validate', (req, res) => {
    const compNumbers = parseBasisStates(req.body.basisStates);

    let sum = 0;
    compNumbers.forEach(value => sum += value.abs());

    if(sum === 1.0) res.status(200).json({ msg: "valid basis states" });
    else res.status(200).json({ msg: "sum of magnitudes is " + sum + " but must be 1.0!" });        //todo change status? 200 is OK, but input is not valid, which seems contradictory
});

router.post('/load', (req, res) => {
    const data = dm.get(req);
    if(data) {
        try {
            let basisStates = req.body.basisStates;
            const q_algo = req.body.algo;
            let worked;
            if(basisStates) {   //basis states were defined by the user so we try to use them
                basisStates = parseBasisStates(basisStates, true);

                console.log(basisStates);
                worked = data.vis.load(q_algo, basisStates);

            } else worked = data.vis.load(q_algo);


            if(worked) sendFile(res, data.ip, "loading");
            else res.status(400).json({ msg: "Error while loading the algorithm!" });

        } catch(err) {
            res.status(400).json({ msg: err.message });
        }
    } else {
        console.log("ERROR! Ip not found!");
    }
});

router.get('/prev', (req, res) => {
    const data = dm.get(req);
    if(data) {
        const ret = data.vis.prev();
        if(ret) sendFile(res, data.ip, "prev");
        else res.send({ msg: "can't go back because we are at the beginning" });    //the client will search for res.svg, but it will be null so they won't redraw

    } else {
        console.log("ERROR! Ip not found!");
    }
});

router.get('/next', (req, res) => {
    const data = dm.get(req);
    if(data) {
        const ret = data.vis.next();
        if(ret) {
            //res.send({ msg: "next state", reload: "true", ip: data.ip });   //something changes so we update the shown dd
            sendFile(res, data.ip, "next");
        } else {
            res.send({ msg: "can't go ahead because we are at the end", reload: "false" });
        }
    } else {
        console.log("ERROR! Ip not found!");
    }
});

//####################################################################################################################################################################

module.exports = router;

function sendFile(res, ip, msg) {
    fs.readFile("data/" + ip + ".dot.svg", "utf8", (error, file) => {
        if(error) res.send({ msg: msg + " failed with " + error.message, ip: ip, svg: null });
        else res.send({ msg: msg + " success", ip: ip, svg: file });
    });
}

function parseBasisStates(basisStates, asDoubles = false) {
    const arr = basisStates.split(" ");

    let compNumbers = [];
    arr.forEach(value => {
        value = value.replace("j", "i");
        try {
            const comp = new Complex(value);
            if(asDoubles) {
                compNumbers.push(comp.re);
                compNumbers.push(comp.im);

            } else compNumbers.push(comp);

        } catch(error) {
            console.log(error);
        }
    });

    return compNumbers;
}