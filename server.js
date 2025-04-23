// Copyright (c) 2023 - 2025 Chair for Design Automation, TUM
// Copyright (c) 2025 Munich Quantum Software Company GmbH
// All rights reserved.
//
// SPDX-License-Identifier: MIT
//
// Licensed under the MIT License

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const indexRouter = require("./routes/index");

const app = express();

//set the maximum size a file the user uploads can have
const fileSizeLimit = "5mb";
app.use(bodyParser.json({ limit: fileSizeLimit }));
app.use(
  bodyParser.urlencoded({
    limit: fileSizeLimit,
    extended: true,
    parameterLimit: 50000,
  }),
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", (req, res, next) => {
  const url = req.url;
  //only register a user on the start of the page (also on loading should work since everything resets there)
  //if(url === '/') dm.register(req, true);
  //else if(url === '/load') dm.register(req, false);
  next();
});

app.use(express.static(path.join(__dirname, "public"))); //the path to index.html is set here

app.use("/", indexRouter);

module.exports = app;
