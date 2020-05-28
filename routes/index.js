
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

//not needed at the moment //todo delete?
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
            const qAlgo = req.body.algo;
            const opNum = parseInt(req.body.opNum);
            const format = parseInt(req.body.format);
            const reset = req.body.reset === "true";   //whether the algorithm should be reset to the start or if iterator and current DD should stay as they are
            /*
            let worked;
            let basisStates = req.body.basisStates;
            if(basisStates) {   //basis states were defined by the user so we try to use them
                basisStates = parseBasisStates(basisStates, true);

                console.log(basisStates);
                worked = data.vis.load(qAlgo, basisStates);

            } else worked = data.vis.load(qAlgo);
             */

            const numOfOperations = data.vis.load(qAlgo, format, opNum, reset);
            if(numOfOperations > -1) {
                //sendFile(res, data.ip, numOfOperations);
                sendDD(res, data.vis.getDD(), numOfOperations);
            }
            else res.status(400).json({ msg: "Error while loading the algorithm!" });

        } catch(err) {
            res.status(400).json({ msg: err.message });
        }
    } else {
        console.log("ERROR! Ip not found!");
    }
});

router.get('/tostart', (req, res) => {
    const data = dm.get(req);
    if(data) {
        const ret = data.vis.toStart();
        if(ret) sendDD(res, data.vis.getDD());  //sendFile(res, data.ip);
        else res.status(403).json({ msg: "you were already at the start" });    //the client will search for res.svg, but it will be null so they won't redraw

    } else {
        console.log("ERROR! Ip not found!");
    }
});

router.get('/prev', (req, res) => {
    const data = dm.get(req);
    if(data) {
        const ret = data.vis.prev();
        if(ret) sendDD(res, data.vis.getDD());  //sendFile(res, data.ip);
        else res.status(403).json({ msg: "can't go back because we are at the beginning" });    //the client will search for res.svg, but it will be null so they won't redraw

    } else {
        console.log("ERROR! Ip not found!");
    }
});

router.get('/next', (req, res) => {
    const data = dm.get(req);
    if(data) {
        const ret = data.vis.next();
        if(ret) sendDD(res, data.vis.getDD());  //sendFile(res, data.ip);     //something changes so we update the shown dd
        else res.send({ msg: "can't go ahead because we are at the end", reload: "false" });

    } else {
        console.log("ERROR! Ip not found!");
    }
});

router.get('/toend', (req, res) => {
    const data = dm.get(req);
    if(data) {
        const ret = data.vis.toEnd();
        if(ret) sendDD(res, data.vis.getDD());  //sendFile(res, data.ip); //something changes so we update the shown dd
        else res.send({ msg: "you were already at the end", reload: "false" });

    } else {
        console.log("ERROR! Ip not found!");
    }
});

//####################################################################################################################################################################

module.exports = router;

function sendDD(res, dd, data) {
    if(data) res.status(200).json({ dot: dd, data: data });
    else res.status(200).json({ dot: dd });
}

function sendFile(res, ip, msg = "") {
    fs.readFile("data/" + ip + ".dot", "utf8", (error, file) => {
        if(error) res.send({ msg: msg + " failed with " + error.message, svg: null });
        else res.send({ msg: msg, svg: file });
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