var port = 3000

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
    db.api(req, res);
});

app.get("/q/*", (req, res) => {
    db.query(req, res);
});

app.get("/r/*", (req, res) => {
    db.query(req, res);
});

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}/`);
});
