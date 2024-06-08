$(document).ready(()=>{
    $("#meshes").on("click", showMeshes);
    $("#nodes").on("click", showNodes);
});

function showMeshes () {
    $("#content").html("");
    $.ajax({url: "/q/meshes", type: "GET", dataType: "JSON"})
        .done((json) => {
            t = $("<table>");
            tr = $("<tr>");
            tr.append($("<th>").html("Name"));
            tr.append($("<th>").html("Mechanism"));
            tr.append($("<th>").html("Delay (ms)"));
            tr.append($("<th>").html("Reporting Interval (s)"));
            t.append(tr);
            for (row of json) {
                tr = $("<tr>").attr("id", row.id);
                tr.append($("<td>").html(row.name).attr("id", "name"));
                tr.append($("<td>").html(row.mechanism).attr("id", "mechanism"));
                tr.append($("<td>").html(row.delay_ms).attr("id", "delay_ms"));
                tr.append($("<td>").html(row.reporting_interval_s).attr("id", "reporting_interval_s"));
                tr.append($("<td>").attr("id", "saveCancel").append($('<img src="images/edit.svg">').on("click", editMesh)));
                t.append(tr);
            }
            t.append($("<tr>").append($("<td>").append($('<img src="images/plus.svg">').on("click", addMesh))));
            $("#content").append(t);
        });
}

function showNodes () {
    $("#content").html("");
    $.ajax({url: "/q/nodes", type: "GET", dataType: "JSON"})
        .done((json) => {
            t = $("<table>");
            tr = $("<tr>");
            tr.append($("<th>").html("Hostname"));
            tr.append($("<th>").html("IP"));
            t.append(tr);
            for (row of json) {
                tr = $("<tr>").attr("id", row.id);
                tr.append($("<td>").html(row.hostname).attr("id", "hostname"));
                tr.append($("<td>").html(row.ip).attr("id", "ip"));
                tr.append($("<td>").attr("id", "saveCancel").append($('<img src="images/edit.svg">').on("click", editNode)));
                t.append(tr);
            }
            t.append($("<tr>").append($("<td>").append($('<img src="images/plus.svg">').on("click", addNode))));
            $("#content").append(t);
        });
}

function editMesh() {
    var cell = $(this).parent();
    cell.parent().children(":not(#saveCancel)").each(makeEditable);
    cell.html("")
        .append($('<img src="images/check.svg">').on("click", updateMesh))
        .append($('<img src="images/x.svg">').on("click", uneditMesh))
        .append($('<img src="images/trash.svg">').on("click", deleteMesh));
}

function updateMesh() {
    var obj = {};
    var cell = $(this).parent();
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editMesh));
    cell.siblings().each(makeUneditable).each((index, item)=>{
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
            .append($('<img src="images/edit.svg">').on("click", editMesh));
    cell.siblings().each(rollback);
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
}

function editNode() {
    var cell = $(this).parent();
    cell.parent().children(":not(#saveCancel)").each(makeEditable);
    cell.html("")
        .append($('<img src="images/check.svg">').on("click", updateNode))
        .append($('<img src="images/x.svg">').on("click", uneditNode))
        .append($('<img src="images/trash.svg">').on("click", deleteNode));
}

function updateNode() {
    var obj = {};
    var cell = $(this).parent();
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editNode));
    cell.siblings().each(makeUneditable).each((index, item)=>{
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
            .append($('<img src="images/edit.svg">').on("click", editNode));
    cell.siblings().each(rollback);
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
    cell.siblings().each(makeUneditable).each((index, item)=>{
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
    tr.append($("<td>").attr("id", "saveCancel"));
    t.append(tr);
    $(this).parent().parent().before(tr);
    tr.children(":not(#saveCancel)").each(makeEditable)
    tr.children("#saveCancel").html("")
        .append($('<img src="images/check.svg">').on("click", addNodeSave))
        .append($('<img src="images/x.svg">').on("click", removeNewRow));
}

function addMeshSave() {
    var obj = {};
    var cell = $(this).parent();
    var that = this;
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editMesh));
    cell.siblings().each(makeUneditable).each((index, item)=>{
        obj[$(item).attr("id")] = $(item).html();
    });
    obj["created_by"] = "system";
    $.ajax({
        type: "GET",
        url: "/r/addMesh",
        data: obj,
        dataType: "json"
    });
}

function addMesh() {
    var tr = $("<tr>");
    tr.append($("<td>").attr("id", "name"));
    tr.append($("<td>").attr("id", "mechanism"));
    tr.append($("<td>").attr("id", "delay_ms"));
    tr.append($("<td>").attr("id", "reporting_interval_s"));
    tr.append($("<td>").attr("id", "saveCancel"));
    t.append(tr);
    $(this).parent().parent().before(tr);
    tr.children(":not(#saveCancel)").each(makeEditable)
    tr.children("#saveCancel").html("")
        .append($('<img src="images/check.svg">').on("click", addMeshSave))
        .append($('<img src="images/x.svg">').on("click", removeNewRow));
}
