const sqlite3 = require("sqlite3").verbose();

var db = new sqlite3.Database("udping.db", (err) => {
    if (err) {
        return console.error(err.message);
    }
});

const queries = {
    "/q/nodes": {"query": "select * from node"},
    "/q/meshes": {"query": "select * from mesh"},
    "/q/members": {"query": "select node.* from node_mesh, node where node.id = node_mesh.node_id and node_mesh.mesh_id = ?", "params": ["mesh_id"]},
    "/q/peers": {"query": "select mesh.name, mesh.mechanism, mesh.delay_ms, mesh.reporting_interval_s, node.ip, node.hostname from node, node_mesh, mesh where node.id = node_mesh.node_id and node_mesh.mesh_id = mesh.id and mesh.id in (select node_mesh.mesh_id from node, node_mesh where node.hostname = ? and node.id = node_mesh.node_id)", "params": ["hostname"]},
    "/r/addNode": {"query": "insert into node (ip, hostname) values (?, ?)", "params": ["ip", "hostname"]},
    "/r/addMesh": {"query": "insert into mesh (name, mechanism, delay_ms, reporting_interval_s, created_by) values (?, ?, ?, ?, ?)", "params": ["name", "mechanism", "delay_ms", "reporting_interval_s", "created_by"], "defaults": {"mechanism": "udping", "delay_ms": 1000, "reporting_interval_s": 30}},
    "/r/deleteMesh": {"query": "delete from mesh where id = ?", "params": ["mesh_id"]},
    "/r/addNodeToMesh": {"query": "insert into node_mesh values (?, ?)", "params": ["node_id", "mesh_id"]},
    "/r/deleteNodeFromMesh": {"query": "delete from node_mesh where node_id=? and mesh_id=?", "params": ["node_id", "mesh_id"]},
    "/r/updateMesh": {"query": "update mesh set UPDATES where id = ?", "params": ["mesh_id"], "updateFields": ["name", "mechanism", "delay_ms", "reporting_interval_s"]},
}

function api (req, res) {
    res.send(JSON.stringify(queries, '', 2));
}

function query (req, res) {
    var path = req.path;
    if (path in queries) {
        console.log("Executing query " + path + ": " + queries[path].query);
        var params = [];
        var query = queries[path].query;
        if ("updateFields" in queries[path]) {
            var updates = [];
            for (field of queries[path].updateFields) {
                if (field in req.query) {
                    console.log("Updating " + field + " to " + req.query[field]);
                    updates.push(field + "= ?");
                    params.push(req.query[field]);
                }
            }
            if (updates.length == 0) {
                console.log ("No fields to update");
                res.send ("No fields to update\n");
                return;
            }
            query = query.replace("UPDATES", updates.join(','));
        }
        if ("params" in queries[path]) {
            for (param of queries[path].params) {
                if (!(param in req.query)) {
                    if (param in queries[path].defaults) {
                        params.push(queries[path].defaults[param]);
                    } else {
                        var msg = "Parameter ${param} not found";
                        console.log(msg);
                        res.send(msg + "\n");
                        return;
                    }
                } else {
                    params.push(req.query[param]);
                }
            }
        }
        if (path[1] == 'q') {
            db.all(query, params, (err, rows) => {
                if (err) {
                    console.log(err);
                    res.send("Error: " + err + "\n");
                    return;
                }
                res.send(JSON.stringify(rows, '', 2) + "\n");
            });
        } else {
            db.run(query, params, (err) => {
                if (err) {
                    console.log(err);
                    res.send("Error: " + err + "\n");
                    return;
                }
                res.send("ok\n");
            });
        }
    }
}

module.exports = {
        "query": query,
        "api": api,
};
