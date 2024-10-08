var port = 8008

const express = require("express");
const path = require("path");
const db = require('./database.js');

var app = express();
const bodyParser = require('body-parser')
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded() );

var StaticDirectory = path.join(__dirname, 'public');
app.use(express.static(StaticDirectory));

app.get("/dbApi", (req, res) => {
    db.api(req, res, (response, status) => {
        res.status(status);
        res.send(response);
    });
});

app.get("/q/*", (req, res) => {
//    console.log("Got request /q/");
    db.query(req, res, (response, status) => {
        res.status(status);
        res.send(response);
    });
});

app.get("/r/*", (req, res) => {
//    console.log("Got request /r/");
    db.query(req, res, (response, status) => {
        res.status(status);
        res.send(response);
    });
});

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}/`);
});
