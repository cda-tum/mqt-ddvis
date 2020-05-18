
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const dm = require('./datamanager');

const app = express();

//set the maximum size a file the user uploads can have
const fileSizeLimit = "5mb";
app.use(bodyParser.json({limit: fileSizeLimit}));
app.use(bodyParser.urlencoded({limit: fileSizeLimit, extended: true, parameterLimit:50000}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', (req, res, next) => {
    //console.log(req.ip + " entered (server.js)");
    //const old = dm.length();
    dm.register(req);
    //console.log(old + " -> " + dm.length());
    next();
});

app.use(express.static(path.join(__dirname, 'public')));        //the path to index.html is set here

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;

const data_path = "./data";
if(!fs.existsSync(data_path)) fs.mkdirSync(data_path, () => {});