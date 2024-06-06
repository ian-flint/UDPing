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

app.get("/getPeers", (req, res) => {
    db.getPeers(req, res);
});

app.get("/getNodes", (req, res) => {
    db.getNodes(req, res);
});

app.get("/getMeshes", (req, res) => {
    db.getMeshes(req, res);
});

app.get("/getMeshMembers", (req, res) => {
    db.getMeshMembers(req, res);
});

app.get("/addNode", (req, res) => {
    db.addNode(req, res);
});

app.get("/addMesh", (req, res) => {
    db.addMesh(req, res);
});

app.get("/addNodeToMesh", (req, res) => {
    db.addMesh(req, res);
});

app.get("/deleteMesh", (req, res) => {
    db.deleteMesh(req, res);
});

app.get("/updateMesh", (req, res) => {
    db.updateMesh(req, res, (err, msg) => {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            res.send(msg);
        }
    });
});

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}/`);
});
