default: ping_otelsender udping_otelsender ping_reader

udping_otelsender: udping_otelsender.go
	go build udping_otelsender.go
	cp udping_otelsender ../bin

ping_otelsender: ping_otelsender.go
	go build ping_otelsender.go
	cp ping_otelsender ../bin

ping_reader: ping_reader.go
	go build ping_reader.go
