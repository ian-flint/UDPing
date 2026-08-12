FROM python:3.14

WORKDIR /usr/src/app

RUN apt update
RUN apt install -y net-tools
RUN apt install -y iputils-ping
RUN apt update
RUN apt install -y python3-requests
RUN apt install -y --only-upgrade libstdc++6
RUN apt dist-upgrade -y
RUN ln -sf /usr/share/zoneinfo/PST8PDT /etc/localtime

COPY bin .
COPY requirements.txt .

#CMD [ "python", "./udping_agent"]
CMD [ "bash" ]

