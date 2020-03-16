
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const dm = require('./datamanager');

var app = express();

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
