FROM python:3.8

WORKDIR /usr/src/app

RUN apt update
RUN apt install -y net-tools
RUN apt install -y iputils-ping
RUN ln -sf /usr/share/zoneinfo/PST8PDT /etc/localtime

COPY bin .
COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

#CMD [ "python", "./udping_agent"]
CMD [ "bash" ]

