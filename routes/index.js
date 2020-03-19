
const qddVis = require("../build/Release/QDD_Vis");
const express = require('express');
const bodyParser = require("body-parser");
const router = express.Router();
const dm = require('../datamanager');
const fs = require('fs');

//var vis = new qddVis.QDDVis("123");

const qasm_header = "OPENQASM 2.0; \n" + 
                    "qreg q[2]; \n" +
                    "include \"qelib1.inc\"; \n";

const bell_circ =   "h q[0]; \n" +
                    "cx q[0],q[1]; \n";

const default_algo =    qasm_header +
                        bell_circ +
                        "";
var curr_algo = default_algo;
var bells = 1;

// make sure the data directory exists
fs.mkdirSync("public/data", { recursive: true })

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
            res.send({ msg: "loaded successfully", ip: data.ip });
        } catch(err) {
            res.status(400).json({ msg: err.message });
            console.log(err);
        }
    } else {
        console.log("ERROR! Ip not found!");
    }
});

//router.get('/')

router.get('/prev', (req, res) => {
    const data = dm.get(req);
    if(data) {
        const ret = data.vis.prev();
        if(ret) {
            res.send({ msg: "prev state", reload: "true", ip: data.ip });   //something changes so we update the shown dd
        } else {
            res.send({ msg: "can't go back because we are at the beginning", reload: "false" });
        }
    } else {
        console.log("ERROR! Ip not found!");
    }
});

router.get('/next', (req, res) => {
    const data = dm.get(req);
    if(data) {
        const ret = data.vis.next();
        if(ret) {
            res.send({ msg: "next state", reload: "true", ip: data.ip });   //something changes so we update the shown dd
        } else {
            res.send({ msg: "can't go ahead because we are at the end", reload: "false" });
        }
    } else {
        console.log("ERROR! Ip not found!");
    }
});

router.get('/init', (req, res) => {
    bells = 0;
    curr_algo = qasm_header;
    res.send({ msg: "state is now zero", algo: curr_algo });
});

router.get('/addBell', (req, res) => {
    bells++;
    curr_algo += bell_circ;
    res.send({ msg: "Added a BellGate - now there are " + bells, algo: curr_algo });
});

router.get('/print', (req, res) => {
    const ip = dm.parseIP(req);
    res.send({ msg: "printing", ip: ip });
});

module.exports = router;
