package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
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
	cmd       *exec.Cmd
	senderCmd *exec.Cmd
	t         target
}

type cmap map[string]*child

func main() {
	var children cmap = make(cmap)
	var targets cmap = make(cmap) // temporary variable to hold the last version retrieved from the server.
	for {
		targets = children.synchronize(targets)
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

func (c *child) launch(children cmap, key string) {
	r, w, err := os.Pipe()
	if err != nil {
		log.Print("Failed to open pipe: ", err)
	}
	defer r.Close()
	ctx, _ := context.WithCancel(context.Background())
	c.cmd = exec.CommandContext(ctx, "ping", "-c", "1000", c.t.PeerIp)
	c.cmd.Stdout = w
	log.Print(c.cmd)
	c.cmd.Start()
	c.senderCmd = exec.CommandContext(ctx, "./ping_otelsender", fmt.Sprintf("-from_host=%s", c.t.LocalHostname), fmt.Sprintf("-to_host=%s", c.t.PeerHostname), fmt.Sprintf("-mesh=%s", c.t.MeshName))
	c.senderCmd.Stdin = r
	c.senderCmd.Stdout = os.Stdout
	log.Print(c.senderCmd)
	c.senderCmd.Start()
	// fmt.Printf("%#v\n", c)
	log.Print("Ping started, PID is ", c.cmd.Process.Pid)
	log.Print("Sender started, PID is ", c.senderCmd.Process.Pid)

	// When one dies, kill the other and let the synchronizer restart both
	go func() {
		c.senderCmd.Wait()
		c.cmd.Cancel()
	}()
	c.cmd.Wait()
	c.senderCmd.Cancel()

	log.Print("Subprocesses terminated.")
	delete(children, key)
}

func (children cmap) synchronize(oldTargets cmap) cmap {
	targets, err := getTargets("apricot:8008", "apricot")
	if err != nil {
		log.Print("Error retrieving targets: ", err)
		targets = oldTargets
	}
	for key, child := range targets {
		_, ok := children[key]
		if !ok {
			log.Print("Adding " + key + " to children")
			go child.launch(children, key)
			children[key] = child
		}
	}
	for key, child := range children {
		_, ok := targets[key]
		if !ok {
			log.Print("Removing " + key + " from children")
			// fmt.Printf("%#v\n", child)
			child.cmd.Cancel()
			child.senderCmd.Cancel()
		}
	}
	return targets
}

func getTargets(controller string, hostname string) (cmap, error) {
	var targetList tlist
	var ret cmap = make(cmap)
	url := "http://" + controller + "/q/peers?hostname=" + hostname
	//log.Print("Retrieving " + url)
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
	}
	// fmt.Println(string(data))
	err = json.Unmarshal(data, &targetList)
	if err != nil {
		return ret, errors.New(fmt.Sprintf("Error unmarshaling: %s", err))
	}
	// fmt.Println(targetList)
	for _, target := range targetList {
		key := fmt.Sprintf("%s:%s.%s:%s.%s:%s", target.MeshMechanism, target.MeshName, target.LocalHostname, target.LocalIp, target.PeerHostname, target.PeerIp)
		ret[key] = &child{nil, nil, target}
	}
	return ret, nil
}
