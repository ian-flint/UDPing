default: client server

CXX = /usr/bin/c++
COMMONOBJ = options.o delay.o protocol.o stats.o 
CPPFLAGS = -I../include -g 
LDFLAGS = -L../lib
CLIBS = 
SLIBS = 

client: $(COMMONOBJ) client.o clientsession.o maclist.o ifinfo.o client.o options.o delay.o protocol.o
	$(CXX) $(LDFLAGS) $(CLIBS) -o udping_client client.o options.o delay.o protocol.o clientsession.o maclist.o ifinfo.o

server: $(COMMONOBJ) server.o serversession.o statswriter.o delay.o options.o protocol.o stats.o
	$(CXX) $(LDFLAGS) $(CLIBS) -o udping_server server.o delay.o options.o protocol.o serversession.o stats.o statswriter.o

clean:
	rm -f udping_client udping_server *.o

