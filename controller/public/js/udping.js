$(document).ready(()=>{
   $( "#controls" ).tabs({
                    activate: (event, ui) => {
                        showPanel (ui.newPanel.attr("id"));
                        },
                    create: (event, ui) => {
                        showPanel (ui.panel.attr("id"));
                        },
                   });
    $("#overlay").on("click", editMembersEnd);
});

function showPanel (id) {
    if (id == "meshes") {
        showMeshes();
    } else {
        showNodes();
    }
}

function showMeshes () {
    $("#meshes").html("");
    $.ajax({url: "/q/meshes", type: "GET", dataType: "JSON"})
        .done((json) => {
            t = $("<table>");
            $("#meshes").append(t);
            tr = $("<tr>");
            tr.append($("<th>").html("Name"));
            tr.append($("<th>").html("Mechanism"));
            tr.append($("<th>").html("Delay (ms)"));
            tr.append($("<th>").html("Reporting Interval (s)"));
            tr.append($("<th>").html("Node Count"));
            t.append(tr);
            for (row of json) {
                tr = $("<tr>").attr("id", row.id);
                tr.append($("<td>").html(row.name).attr("id", "name"));
                tr.append($("<td>").html(row.mechanism).attr("id", "mechanism"));
                tr.append($("<td>").html(row.delay_ms).attr("id", "delay_ms"));
                tr.append($("<td>").html(row.reporting_interval_s).attr("id", "reporting_interval_s"));
                tr.append($("<td>").html(row.node_count).attr("id", "node_count"));
                tr.append($("<td>").attr("id", "saveCancel")
                                .append($('<img src="images/edit.svg">').on("click", editMesh))
                                .append($('<img src="images/file-text.svg">').on("click", editMeshMembers))
                                );
                t.append(tr);
            }
            t.append($("<tr>").append($("<td>").append($('<img src="images/plus.svg">').on("click", addMesh))));
        });
}

function showNodes () {
    $("#nodes").html("");
    $.ajax({url: "/q/nodes", type: "GET", dataType: "JSON"})
        .done((json) => {
            t = $("<table>");
            tr = $("<tr>");
            tr.append($("<th>").html("Hostname"));
            tr.append($("<th>").html("IP"));
            tr.append($("<th>").html("Last Seen"));
            t.append(tr);
            for (row of json) {
                tr = $("<tr>").attr("id", row.id);
                tr.append($("<td>").html(row.hostname).attr("id", "hostname"));
                tr.append($("<td>").html(row.ip).attr("id", "ip"));
                tr.append($("<td>").html(row.last_seen).attr("last_seen", "ip"));
                tr.append($("<td>").attr("id", "saveCancel")
                    .append($('<img src="images/edit.svg">').on("click", editNode))
                    .append($('<img src="images/file-text.svg">').on("click", editMeshesByNode))
                    );
                t.append(tr);
            }
            t.append($("<tr>").append($("<td>").append($('<img src="images/plus.svg">').on("click", addNode))));
            $("#nodes").append(t);
        });
}

function editMesh() {
    var cell = $(this).parent();
    var mechanism = cell.siblings("#mechanism").html();
    cell.parent().children(":not(#saveCancel, #node_count)").each(makeEditable);
    cell.siblings("#mechanism").html("").append($("<select>").val(mechanism)
                                        .append($("<option>udping</option>"))
                                        .append($("<option>ping</option>"))
                                        );
    cell.siblings("#mechanism").children("select").val(mechanism);
    cell.html("")
        .append($('<img src="images/check.svg">').on("click", updateMesh))
        .append($('<img src="images/x.svg">').on("click", uneditMesh))
        .append($('<img src="images/trash.svg">').on("click", deleteMesh));
}

function updateMesh() {
    var obj = {};
    var cell = $(this).parent();
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editMesh))
            .append($('<img src="images/file-text.svg">').on("click", editMeshMembers));
    cell.siblings("#mechanism").html(cell.siblings("#mechanism").children("select").val());
    cell.siblings(":not(#node_count)").each(makeUneditable).each((index, item)=>{
        obj[$(item).attr("id")] = $(item).html();
    });
    obj["mesh_id"] = cell.parent().attr("id");
    $.ajax({
        type: "GET",
        url: "/r/updateMesh",
        data: obj,
        dataType: "json"
    });
}

function uneditMesh() {
    var cell = $(this).parent();
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editMesh))
            .append($('<img src="images/file-text.svg">').on("click", editMeshMembers));
    cell.siblings().each(rollback);
    cell.siblings("#mechanism").html(row.mechanism).attr("id", "mechanism");
}
function deleteMesh() {
    var row = $(this).parent().parent();
    var id = row.attr("id");
    row.remove();
    $.ajax({
        type: "GET",
        url: "/r/deleteMesh",
        data: {mesh_id: id},
        dataType: "json"
    });
    $.ajax({
        type: "GET",
        url: "/r/deleteNodeMesh",
        data: {mesh_id: id},
        dataType: "json"
    });
}

function editNode() {
    var cell = $(this).parent();
    cell.parent().children(":not(#saveCancel, #last_seen)").each(makeEditable);
    cell.html("")
        .append($('<img src="images/check.svg">').on("click", updateNode))
        .append($('<img src="images/x.svg">').on("click", uneditNode))
        .append($('<img src="images/trash.svg">').on("click", deleteNode));
}

function updateNode() {
    var obj = {};
    var cell = $(this).parent();
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editNode))
            .append($('<img src="images/file-text.svg">').on("click", editNode));
    cell.siblings(":not(#last_seen)").each(makeUneditable).each((index, item)=>{
        obj[$(item).attr("id")] = $(item).html();
    });
    obj["node_id"] = cell.parent().attr("id");
    $.ajax({
        type: "GET",
        url: "/r/updateNode",
        data: obj,
        dataType: "json"
    });
}

function uneditNode() {
    var cell = $(this).parent();
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editNode))
            .append($('<img src="images/file-text.svg">').on("click", editNode));
    cell.siblings(":not(#last_seen)").each(rollback);
}
function deleteNode() {
    var row = $(this).parent().parent();
    var id = row.attr("id");
    row.remove();
    $.ajax({
        type: "GET",
        url: "/r/deleteNode",
        data: {node_id: id},
        dataType: "json"
    });
    $.ajax({
        type: "GET",
        url: "/r/deleteNodeMesh",
        data: {node_id: id},
        dataType: "json"
    });
}

function makeEditable() {
    var text = $(this).html();
    var width = $(this).css("width");
    $(this).html("").data("originalText", text);
    $(this).append($("<input type=text>").attr("value", text).css("width", width));
}

function makeUneditable() {
    var text = $(this).children("input").val();
    $(this).html(text);
}

function rollback() {
    var text = $(this).data("originalText");
    $(this).html(text);
}

function removeNewRow() {
    $(this).parent().parent().remove();
}

function addNodeSave() {
    var obj = {};
    var cell = $(this).parent();
    var that = this;
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editNode));
    cell.siblings(":not(#last_seen)").each(makeUneditable).each((index, item)=>{
        obj[$(item).attr("id")] = $(item).html();
    });
    $.ajax({
        type: "GET",
        url: "/r/addNode",
        data: obj,
        dataType: "json"
    });
}

function addNode() {
    var tr = $("<tr>");
    tr.append($("<td>").attr("id", "hostname"));
    tr.append($("<td>").attr("id", "ip"));
    tr.append($("<td>").attr("id", "last_seen"));
    tr.append($("<td>").attr("id", "saveCancel"));
    t.append(tr);
    $(this).parent().parent().before(tr);
    tr.children(":not(#saveCancel, #last_seen)").each(makeEditable)
    tr.children("#saveCancel").html("")
        .append($('<img src="images/check.svg">').on("click", addNodeSave))
        .append($('<img src="images/x.svg">').on("click", removeNewRow));
}

function addMeshSave() {
    var obj = {};
    var cell = $(this).parent();
    var that = this;
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editMesh))
            .append($('<img src="images/file-text.svg">').on("click", editMeshMembers));
    cell.siblings().each(makeUneditable).each((index, item)=>{
        obj[$(item).attr("id")] = $(item).html();
    });
    obj["created_by"] = "system";
    $.ajax({
        type: "GET",
        url: "/r/addMesh",
        data: obj,
    }).done(showMeshes);
}

function addMesh() {
    var tr = $("<tr>");
    tr.append($("<td>").attr("id", "name"));
    tr.append($("<td>").attr("id", "mechanism"));
    tr.append($("<td>").attr("id", "delay_ms"));
    tr.append($("<td>").attr("id", "reporting_interval_s"));
    tr.append($("<td>").attr("id", "node_count"));
    tr.append($("<td>").attr("id", "saveCancel"));
    t.append(tr);
    $(this).parent().parent().before(tr);
    tr.children(":not(#saveCancel #node_count)").each(makeEditable)
    tr.children("#saveCancel").html("")
        .append($('<img src="images/check.svg">').on("click", addMeshSave))
        .append($('<img src="images/x.svg">').on("click", removeNewRow));
}

function editMeshMembers() {
    $("#overlay").css("visibility", "visible");
    $("#editMembers").css("visibility", "visible");
    var row = $(this).parent().parent();
    var mesh_id = row.attr("id");
    if (mesh_id == "editMembers") {
        mesh_id = $("#editMembers").attr("mesh_id");
    }
    $("#editMembers").attr("mesh_id", mesh_id);
    $.ajax({
        type: "GET",
        url: "/q/nodeMeshSelector",
        data: {mesh_id: mesh_id},
        dataType: "json"
    }).done((json) => {
        $("#editMembers").html('');
        $("#editMembers").append($('<div width=100% align=right>')
            .append($('<img src="images/x.svg">').on("click", editMembersEnd))
            .append($('<img src="images/refresh-cw.svg">').on("click", editMeshMembers)));
        var t = $("<table>").attr("id", mesh_id);
        $("#editMembers").append(t);
        for (row of json) {
            tr = $("<tr>").attr("id", row.node_id).on("click", toggleMeshMember);
            if (row.mesh_id > 0) {
                tr.css("font-weight", "700");
            } else {
                tr.css("font-weight", "400");
            }
            tr.append($("<td>").html(row.hostname));
            tr.append($("<td>").html(row.ip));
            if (row.mesh_id > 0) {
                tr.append($("<td>").attr("id", "edit").html('<image src="images/minus.svg">'));
            } else {
                tr.append($("<td>").attr("id", "edit").html('<image src="images/plus.svg">'));
            }
            t.append(tr);
        }
    });
}

function editMeshesByNode() {
    $("#overlay").css("visibility", "visible");
    $("#editMembers").css("visibility", "visible");
    var row = $(this).parent().parent();
    var node_id = row.attr("id");
    if (node_id == "editMembers") {
        node_id = $("#editMembers").attr("node_id");
    }
    $("#editMembers").attr("node_id", node_id);
    $.ajax({
        type: "GET",
        url: "/q/nodeMeshByNode",
        data: {node_id: node_id},
        dataType: "json"
    }).done((json) => {
        $("#editMembers").html('');
        $("#editMembers").append($('<div width=100% align=right>')
            .append($('<img src="images/x.svg">').on("click", editMembersEnd))
            .append($('<img src="images/refresh-cw.svg">').on("click", editMeshesByNode))); 
        var t = $("<table>").attr("id", node_id);
        $("#editMembers").append(t);
        for (row of json) {
            tr = $("<tr>").attr("id", row.mesh_id).on("click", toggleNodeMesh); 
            if (row.node_id > 0) {
                tr.css("font-weight", "700");
            } else {
                tr.css("font-weight", "400");
            }
            tr.append($("<td>").html(row.name));
            if (row.node_id > 0) {
                tr.append($("<td>").attr("id", "edit").html('<image src="images/minus.svg">'));
            } else {
                tr.append($("<td>").attr("id", "edit").html('<image src="images/plus.svg">'));
            }
            t.append(tr);
        }
    });
}

function toggleMeshMember() {
    var tr = $(this);
    var node_id = tr.attr("id");
    var mesh_id = tr.parent().attr("id");
    var weight = tr.css("font-weight");
    if (tr.css("font-weight") == "700") {
        tr.css("font-weight", "400");
        tr.children("#edit").html('<image src="images/plus.svg">');
        $.ajax({
            type: "GET",
            url: "/r/deleteNodeFromMesh",
            data: {mesh_id: mesh_id, node_id: node_id},
            dataType: "json"
        });
    } else {
        tr.css("font-weight", "700");
        tr.children("#edit").html('<image src="images/minus.svg">');
        $.ajax({
            type: "GET",
            url: "/r/addNodeToMesh",
            data: {mesh_id: mesh_id, node_id: node_id},
            dataType: "json"
        });
    }
}

function toggleNodeMesh() {
    var tr = $(this);
    var mesh_id = tr.attr("id");
    var node_id = tr.parent().attr("id");
    var weight = tr.css("font-weight");
    if (tr.css("font-weight") == "700") {
        tr.css("font-weight", "400");
        tr.children("#edit").html('<image src="images/plus.svg">');
        $.ajax({
            type: "GET",
            url: "/r/deleteNodeFromMesh",
            data: {mesh_id: mesh_id, node_id: node_id},
            dataType: "json"
        });
    } else {
        tr.css("font-weight", "700");
        tr.children("#edit").html('<image src="images/minus.svg">');
        $.ajax({
            type: "GET",
            url: "/r/addNodeToMesh",
            data: {mesh_id: mesh_id, node_id: node_id},
            dataType: "json"
        });
    }
}


function editMembersEnd() {
    $("#overlay").css("visibility", "hidden");
    $("#editMembers").css("visibility", "hidden");
    $("#editMembers").html('');
    showMeshes();
}
