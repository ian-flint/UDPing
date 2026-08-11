package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "time"
    "strings"
    "sync"

    "context"
    "errors"

)

func check(e error) {
    if e != nil {
        panic(e)
    }
}

func usage() {
    fmt.Println("Usage: ping_otelsender -from_host=<from_host> -to_host=<to_host> -mesh=<mesh>")
    os.Exit(1)
}

func main() {
    var mu sync.Mutex
    targetCount := 0
    dropCount := 0
    rttCount := 0
    rttSum := float64(0)

    dump := func() {
        for {
            time.Sleep(10 * time.Second)
            mu.Lock()
            rtt := float64(0)
            if rttCount > 0 {
                rtt = rttSum / float64(rttCount)
            }
            fmt.Printf("%s: Ping: %d:%d:%f\n", time.Now(), targetCount, dropCount, rtt)
            rttSum = 0
            rttCount = 0
            dropCount = 0
            targetCount = 0
            mu.Unlock()
        }
    }
    go dump()

    scanner := bufio.NewScanner(os.Stdin)
    // ringBuf is zero if no misses or a response has been received, nonzero if there are misses
    var ringBuf [1024]int
    curSeq := 0
    for scanner.Scan() {
        buf := scanner.Text()
        //fmt.Println(buf)
        seq_ix := strings.Index(buf, "icmp_seq=")
        icmpSeq := 0
        if seq_ix == -1 {
            fmt.Println(buf)
            fmt.Println("Ignoring line without icmp sequence")
            continue
        } else {
            tmp, _ := strconv.ParseInt(strings.Split(strings.Split(buf[seq_ix:], " ")[0], "=")[1], 10, 16)
            icmpSeq = int(tmp)
        }
        //fmt.Println("ICMP Sequence = ", icmpSeq)
        icmpSeq %= 1024
        // reset the ring buffer space if this is a new sequence
        if icmpSeq > curSeq || curSeq - icmpSeq > 1000 {
            ringBuf[icmpSeq] = 0
            curSeq = icmpSeq
        }
        if (strings.Index(buf, "no answer yet") > -1) ||
           (strings.Index(buf, "Unreachable") > -1) ||
           (strings.Index(buf, "No route to host") > -1) {
            if ringBuf[icmpSeq] == 0 {
                mu.Lock()
                targetCount += 1
                dropCount += 1
                mu.Unlock()
                ringBuf[icmpSeq] = 1
                //fmt.Println("Incrementing drop count")
            }
        } else if timeix := strings.Index(buf, "time="); timeix > -1 {
            field := strings.Split(buf[timeix:], " ")[0]
            rtt, err := strconv.ParseFloat(strings.Split(field, "=")[1], 64)
            check(err)
            mu.Lock()
            rttCount += 1
            rttSum += rtt
            //fmt.Println("Incrementing rtt count")
            if ringBuf[icmpSeq] == 0 {
                targetCount += 1
            } else {
                dropCount -= 1
                //fmt.Println("Decrementing drop count")
            }
            mu.Unlock()
        } else {
            fmt.Println(buf)
            fmt.Println("Ignoring unknown status line")
        }
    }

    if err := scanner.Err(); err != nil {
        fmt.Fprintln(os.Stderr, "Error: ", err)
        os.Exit(1)
    }
}


// setupOTelSDK bootstraps the OpenTelemetry pipeline.
// If it does not return an error, make sure to call shutdown for proper cleanup.
func setupOTelSDK(ctx context.Context) (shutdown func(context.Context) error, err error) {
    var shutdownFuncs []func(context.Context) error

    // shutdown calls cleanup functions registered via shutdownFuncs.
    // The errors from the calls are joined.
    // Each registered cleanup will be invoked once.
    shutdown = func(ctx context.Context) error {
        var err error
        for _, fn := range shutdownFuncs {
            err = errors.Join(err, fn(ctx))
        }
        shutdownFuncs = nil
        return err
    }

    return
}


