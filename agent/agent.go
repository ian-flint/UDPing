package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

type target struct {
	MeshMechanism          string `json:"mesh_mechanism"`
	MeshName               string `json:"mesh_name"`
	LocalHostname          string `json:"local_hostname"`
	LocalIp                string `json:"local_ip"`
	PeerHostname           string `json:"peer_hostname"`
	PeerIp                 string `json:"peer_ip"`
	MeshReportingIntervalS int    `json:"mesh_reporting_interval_s"`
	MeshDelayMs            int    `json:"mesh_delay_ms"`
}

type tlist []target

type child struct {
	cmd *exec.Cmd
	t   target
}

type cmap map[string]*child

func main() {
	var children cmap = make(cmap)
	for {
		children.synchronize()
		time.Sleep(time.Second)
	}
}

func getNextHop(target string) string {
	nextHop := target
	out, _ := exec.Command("ping", "-n", "-c", "1", "-t", "1", "-4", target).Output()
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if strings.Index(line, "exceeded") >= 0 {
			nextHop = strings.Fields(line)[1]
		}
	}
	return nextHop
}

func (c *child) launch() {
	//for {
	ctx, _ := context.WithCancel(context.Background())
	c.cmd = exec.CommandContext(ctx, "ping", "-c", "1000", "10.0.0.1")
	c.cmd.Start()
	// fmt.Printf("%#v\n", c)
	log.Print("Ping started, PID is ", c.cmd.Process.Pid)
	c.cmd.Wait()
	if context.Cause(ctx) == context.Canceled {
		log.Print("Subprocess canceled.")
	} else {
		log.Print("Subprocess terminated.")
	}
	//}
}

func (children cmap) synchronize() {
	targets, err := getTargets("apricot:8008", "apricot")
	if err != nil {
		log.Print("Error retrieving targets: ", err)
	} else {
		for key, child := range targets {
			_, ok := children[key]
			if !ok {
				log.Print("Adding " + key + " to children")
				go child.launch()
				children[key] = child
			}
		}
		for key, child := range children {
			_, ok := targets[key]
			if !ok {
				log.Print("Removing " + key + " from children")
				// fmt.Printf("%#v\n", child)
				child.cmd.Cancel()
				delete(children, key)
			}
		}
	}
}

func getTargets(controller string, hostname string) (cmap, error) {
	var targetList tlist
	var ret cmap = make(cmap)
	url := "http://" + controller + "/q/peers?hostname=" + hostname
	log.Print("Retrieving " + url)
	resp, err := http.Get(url)
	if err != nil {
		return ret, errors.New(fmt.Sprintf("Error retrieving config: %s", err))
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ret, errors.New(fmt.Sprintf("Rest error: %s", err))
	}
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return ret, errors.New(fmt.Sprintf("Error reading body: %s", err))
		log.Print("Error reading body: ", err)
	}
	// fmt.Println(string(data))
	err = json.Unmarshal(data, &targetList)
	if err != nil {
		return ret, errors.New(fmt.Sprintf("Error unmarshaling: %s", err))
		log.Print("Error unmarshaling: ", err)
	}
	// fmt.Println(targetList)
	for _, target := range targetList {
		key := fmt.Sprintf("%s:%s.%s:%s.%s:%s", target.MeshMechanism, target.MeshName, target.LocalHostname, target.LocalIp, target.PeerHostname, target.PeerIp)
		ret[key] = &child{nil, target}
	}
	return ret, nil
}

//[
//  {
//    "local_ip": "10.0.0.243",
//    "local_hostname": "apricot",
//    "mesh_name": "pingTest",
//    "mesh_mechanism": "ping",
//    "mesh_delay_ms": 1000,
//    "mesh_reporting_interval_s": 10,
//    "peer_ip": "10.0.0.241",
//    "peer_hostname": "ian-jetson"
//  },
//  {
//    "local_ip": "10.0.0.243",
//    "local_hostname": "apricot",
//    "mesh_name": "pingTest",
//    "mesh_mechanism": "ping",
//    "mesh_delay_ms": 1000,
//    "mesh_reporting_interval_s": 10,
//    "peer_ip": "10.0.0.240",
//    "peer_hostname": "kiwi"
//  }
//]
