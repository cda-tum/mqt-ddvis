
const qddVis = require("../build/Release/QDD_Vis");
const express = require('express');
const bodyParser = require("body-parser");
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
            const q_algo = req.body.algo;
            const text = data.vis.load(q_algo);
            sendFile(res, data.ip, "loading");

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