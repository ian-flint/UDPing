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
                tr = $("<tr>");
                tr.append($("<td>").html(row.name));
                tr.append($("<td>").html(row.mechanism));
                tr.append($("<td>").html(row.delay_ms));
                tr.append($("<td>").html(row.reporting_interval_s));
                t.append(tr);
            }
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
                tr = $("<tr>");
                tr.append($("<td>").html(row.hostname));
                tr.append($("<td>").html(row.ip));
                t.append(tr);
            }
            $("#content").append(t);
        });
}
