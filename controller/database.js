const sqlite3 = require("sqlite3").verbose();

var db = new sqlite3.Database("udping.db", (err) => {
    if (err) {
        return console.error(err.message);
    }
});

function getPeers (req, res) {
    console.log("Getting peers");
    var node_ids = [];
    db.all("select mesh.name, mesh.mechanism, mesh.delay_ms, mesh.reporting_interval_s, node.ip, node.hostname from node, node_mesh, mesh where node.id = node_mesh.node_id and node_mesh.mesh_id = mesh.id and mesh.id in (select node_mesh.mesh_id from node, node_mesh where node.hostname = ? and node.id = node_mesh.node_id)", [req.query.hostname], (err, rows) => {
        if (err) {
            console.log(err);
        }
        res.send(JSON.stringify(rows, '', 2) + "\n");
    });
}

function getNodes (req, res) {
    console.log("Getting Nodes");
    db.all("select * from node", (err, rows) => {
        if (err) {
            console.log(err);
        }
        res.send(JSON.stringify(rows, '', 2) + "\n");
    });
}

function getMeshes (req, res) {
    console.log("Getting Meshes");
    db.all("select * from mesh", (err, rows) => {
        if (err) {
            console.log(err);
        }
        res.send(JSON.stringify(rows, '', 2) + "\n");
    });
}

function getMeshMembers (req, res) {
    console.log("Getting Mesh Members");
    db.all("select node.* from node_mesh, node where node.id = node_mesh.node_id and node_mesh.mesh_id = ?", [req.query.mesh_id], (err, rows) => {
        if (err) {
            console.log(err);
        }
        res.send(JSON.stringify(rows, '', 2) + "\n");
    });
}

function addNode (req, res) {
    console.log("Adding Node");
    db.run("insert into node (ip, hostname) values (?, ?)", [req.query.ip, req.query.hostname], (err) => {
        if (err) {
            console.log(err.message);
            res.send(err.message + "\n");
        } else {
            res.send("ok");
        }
    });
}

function addMesh (req, res) {
    console.log("Adding Mesh");
    if (!('mechanism' in req.query)) {
        req.query.mechanism = "udping";
    }
    if (!("delay_ms" in req.query)) {
        req.query.delay_ms = 1000;
    }
    if (!("reporting_interval_s" in req.query)) {
        req.query.reporting_interval_s = 30;
    }
    db.run("insert into mesh (name, mechanism, delay_ms, reporting_interval_s, created_by) values (?, ?, ?, ?, ?)", [req.query.name, req.query.mechanism, req.query.delay_ms, req.query.reporting_interval_s, req.query.created_by], (err) => {
        if (err) {
            console.log(err.message);
            res.send(err.message + "\n");
        } else {
            res.send("ok");
        }
    });
}

function addNodeToMesh (req, res) {
    console.log("Adding node to mesh");
    db.run("insert into node_mesh values ?, ?", [req.query.node_id, req.query.mesh_id], (err) => {
        if (err) {
            console.log(err.message);
            res.send(err.message + "\n");
        } else {
            res.send("ok");
        }
    });
}

function deleteMesh (req, res) {
    console.log("deleting mesh");
    if (!("mesh_id" in req.query)) {
        var err = "No mesh specified";
        console.log (err);
        res.send("Error: " + err + "\n");
    }
    db.run("delete from mesh where id = ?", [req.query.mesh_id], (err) => {
        if (err) {
            console.log(err.message);
            res.send(err.message + "\n");
        } else {
            db.run("delete from node_mesh where mesh_id = ?", [req.query.mesh_id], (err) => {
                if (err) {
                    console.log(err.message);
                    res.send(err.message + "\n");
                } else {
                    res.send("ok");
                }
            });
        }
    });
}

function updateMesh (req, res) {
    console.log("Updating mesh");
    if (!("mesh_id" in req.query)) {
        var err = "No mesh specified";
        console.log (err);
        res.send("Error: " + err + "\n");
    }
    var updates = [];
    var params = [];
    for (field of ["name", "mechanism", "delay_ms", "reporting_interval_s"]) {
        if (field in req.query) {
            console.log("setting " + field + " to " + req.query[field]);
            updates.push(field + "= ?");
            params.push(req.query[field]);
        }
    }
    params.push (req.query.mesh_id);
    if (updates.length > 0) {
        var query = "update mesh set " + updates.join(',') + " where id = ?";
        console.log(query);
        console.log(JSON.stringify(params));
        db.run(query, params, (err) => {
            if (err) {
                console.log(err.message);
                res.send(err.message + "\n");
            } else {
                res.send("Ok");
            }
        });
    } else {
        res.send("Nothing to update");
    }
}

module.exports = {
        "getPeers": getPeers, 
        "getNodes": getNodes,
        "getMeshes": getMeshes,
        "getMeshMembers": getMeshMembers,
        "addNode": addNode,
        "addMesh": addMesh,
        "addNodeToMesh": addNodeToMesh,
        "deleteMesh": deleteMesh,
        "updateMesh": updateMesh,
};
