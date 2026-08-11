FROM python:3.8

WORKDIR /usr/src/app

RUN apt update
RUN apt install -y net-tools
RUN apt install -y iputils-ping
RUN apt install -y python3-requests
RUN ln -sf /usr/share/zoneinfo/PST8PDT /etc/localtime

COPY bin .
COPY requirements.txt .

RUN pip3 install --upgrade pip
RUN pip3 install --no-cache-dir -r requirements.txt

#CMD [ "python", "./udping_agent"]
CMD [ "bash" ]

