default: local 

test:
	cd tests; make

local:
	mkdir -p bin
	cd src; make
	cd otel; make
	cd agent; make
	cp src/udping_client src/udping_server bin
	docker build -t udping_agent .

clean:
	cd src; make clean
	cd tests; make clean
	cd bin; rm -f udping_client udping_server
