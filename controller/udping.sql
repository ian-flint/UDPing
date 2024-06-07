create table mesh (
    id integer not null primary key,
    name varchar(64) not null,
    mechanism varchar(20) not null,
    delay_ms int not null,
    reporting_interval_s int not null,
    created datetime not null default now,
    created_by varchar(64) not null
);

create unique index mesh_name on mesh(name);

create table node (
    id integer not null primary key,
    ip varchar(16) not null,
    hostname varchar(128) not null
);

create index node_ip on node (ip);
create index node_name on node (hostname);

create table node_mesh (
     node_id integer not null,
     mesh_id integer not null
);

create index node_mesh_node on node_mesh (node_id);
create index node_mesh_mesh on node_mesh (mesh_id);
create unique index node_mesh_pk on node_mesh (node_id, mesh_id);
