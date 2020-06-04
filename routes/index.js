
const qddVis = require("../build/Release/QDD_Vis");
const express = require('express');
const router = express.Router();
const dm = require('../datamanager');
const fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
    //console.log(req.ip + " has entered (index.js)");
    //dm.register(req);
    //res.render('index', { title: 'QDD Visualizer' });
});

router.post('/load', (req, res) => {
    const data = dm.get(req);
    if(data) {
        try {
            const qAlgo = req.body.algo;
            const opNum = parseInt(req.body.opNum);
            const format = parseInt(req.body.format);
            const reset = req.body.reset === "true";   //whether the algorithm should be reset to the start or if iterator and current DD should stay as they are

            const numOfOperations = data.vis.load(qAlgo, format, opNum, reset);
            if(numOfOperations > -1) sendDD(res, data.vis.getDD(), numOfOperations);
            else res.status(400).json({ msg: "Error while loading the algorithm!" });

        } catch(err) {
            const retry = err.message.startsWith("Invalid Algorithm!"); //if the algorithm is invalid, we need to send the last valid algorithm
            res.status(400).json({ msg: err.message, retry: retry});
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

router.get('/toline', (req, res) => {
    const data = dm.get(req);
    const line = parseInt(req.query.line);
    if(data) {
        const ret = data.vis.toLine(line);
        if(ret) sendDD(res, data.vis.getDD());  //sendFile(res, data.ip); //something changes so we update the shown dd
        else res.send({ msg: "you were already at line " + line, reload: "false" });

    } else {
        console.log("ERROR! Ip not found!");
    }
});

//####################################################################################################################################################################

module.exports = router;

function sendDD(res, dd, data) {
    if(data || data === 0) res.status(200).json({ dot: dd, data: data });
    else res.status(200).json({ dot: dd });

}

function sendFile(res, ip, msg = "") {
    fs.readFile("data/" + ip + ".dot", "utf8", (error, file) => {
        if(error) res.send({ msg: msg + " failed with " + error.message, svg: null });
        else res.send({ msg: msg, svg: file });
    });
}