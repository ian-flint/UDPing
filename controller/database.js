const sqlite3 = require("sqlite3").verbose();

var db = new sqlite3.Database("udping.db", (err) => {
    if (err) {
        return console.error(err.message);
    }
});

const queries = {
    "/q/nodes": {"query": "select * from node order by hostname"},
    "/q/meshes": {"query": "select mesh.*, (select count(*) from node_mesh where mesh_id = id) as node_count from mesh order by name"},
    "/q/members": {"query": "select node.* from node_mesh, node where node.id = node_mesh.node_id and node_mesh.mesh_id = ?", "params": ["mesh_id"]},
    //"/q/peers": {"query": "select mesh.name, mesh.mechanism, mesh.delay_ms, mesh.reporting_interval_s, node.ip, node.hostname from node, node_mesh, mesh where node.id = node_mesh.node_id and node_mesh.mesh_id = mesh.id and mesh.id in (select node_mesh.mesh_id from node, node_mesh where node.hostname = ? and node.id = node_mesh.node_id)", "params": ["hostname"]},
    "/q/peers": {"query": "select node1.ip as local_ip, node1.hostname as local_hostname, mesh.name as mesh_name, mesh.mechanism as mesh_mechanism, mesh.delay_ms as mesh_delay_ms, mesh.reporting_interval_s as mesh_reporting_interval_s, node2.ip as peer_ip, node2.hostname as peer_hostname from node node1, node node2, node_mesh nm1, node_mesh nm2, mesh where node1.hostname = ? and node1.id = nm1.node_id and nm1.mesh_id = nm2.mesh_id and node2.id = nm2.node_id and mesh.id = nm1.mesh_id and nm2.node_id != node1.id", "params": ["hostname"]},
    "/r/addNode": {"query": "insert into node (ip, hostname) values (?, ?)", "params": ["ip", "hostname"]},
    "/r/addMesh": {"query": "insert into mesh (name, mechanism, delay_ms, reporting_interval_s, created_by) values (?, ?, ?, ?, ?)", "params": ["name", "mechanism", "delay_ms", "reporting_interval_s", "created_by"], "defaults": {"mechanism": "udping", "delay_ms": 1000, "reporting_interval_s": 30}},
    "/r/deleteMesh": {"query": "delete from mesh where id = ?", "params": ["mesh_id"]},
    "/r/addNodeToMesh": {"query": "insert into node_mesh values (?, ?)", "params": ["node_id", "mesh_id"]},
    "/r/deleteNodeFromMesh": {"query": "delete from node_mesh where node_id=? and mesh_id=?", "params": ["node_id", "mesh_id"]},
    "/r/updateMesh": {"query": "update mesh set UPDATES where id = ?", "params": ["mesh_id"], "updateFields": ["name", "mechanism", "delay_ms", "reporting_interval_s"]},
    "/r/updateNode": {"query": "update node set UPDATES where id = ?", "params": ["node_id"], "updateFields": ["hostname", "ip"]},
    "/r/deleteNode": {"query": "delete from node where id = ?", "params": ["node_id"]},
    "/r/deleteNodeMesh": {"query": "delete from node_mesh where node_id = ? or mesh_id = ?", "params": ["node_id", "mesh_id"], "defaults": {"node_id": "", "mesh_id": ""}},
    "/q/nodeMeshSelector": {"query": "select id as node_id, ip, hostname, mesh_id from node left outer join node_mesh on node.id = node_mesh.node_id and node_mesh.mesh_id=? order by mesh_id desc, hostname", "params": ["mesh_id"]},
    "/q/nodeMeshByNode": {"query": "select id as mesh_id, name, node_id from mesh left outer join node_mesh on mesh.id = node_mesh.mesh_id and node_mesh.node_id=? order by node_id desc, name", "params": ["node_id"]},
}

function api (req, res, callback) {
    callback(JSON.stringify(queries, '', 2), 200);
}

function query (req, res, callback) {
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
                callback("No fields to update\n", 400);
                return;
            }
            query = query.replace("UPDATES", updates.join(','));
        }
        if ("params" in queries[path]) {
            for (param of queries[path].params) {
                if (!(param in req.query)) {
                    if ("defaults" in queries[path] && param in queries[path].defaults) {
                        params.push(queries[path].defaults[param]);
                    } else {
                        var msg = "Parameter " + param + " not found";
                        console.log(msg);
                        callback(msg + "\n", 400);
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
                    callback("Error: " + err + "\n", 400);
                    return;
                }
                callback(JSON.stringify(rows, '', 2) + "\n", 200);
                return;
            });
        } else {
            db.run(query, params, (err) => {
                if (err) {
                    console.log(err);
                    callback("Error: " + err + "\n", 400);
                    return;
                }
                callback("Ok\n", 200);
                return;
            });
        }
    } else {
        console.log ("Unsupported query " + path);
        callback("Unsupported query " + path + "\n", 400);
        return;
    }
}

module.exports = {
        "query": query,
        "api": api,
};
