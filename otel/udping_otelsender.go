package main

import (
    "bufio"
    "fmt"
    "os"
    "encoding/json"
    "strconv"
    "time"
    "os/signal"
    "flag"
    "sync"

    "context"
    "errors"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
    "go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

type datapoint struct {
    from_host string
    to_host string
    dropCount int
    targetCount int
    rttCount int
    rttSum float64
}

func check(e error) {
    if e != nil {
        panic(e)
    }
}

func usage() {
    fmt.Println("Usage: udping_otelsender -mesh=<mesh>")
    os.Exit(1)
}

func main() {
    mesh := flag.String("mesh", "", "Mesh")
    var mu sync.Mutex
    flag.Parse()
    if *mesh == "" {
        usage()
    }
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
    defer stop()
    otelShutdown, err := setupOTelSDK(ctx)
    if err != nil {
        return
    }
    defer func() {
        err = errors.Join(err, otelShutdown(context.Background()))
    }()
    var meter = otel.Meter("udping")
    datapointSummary := make(map[string]*datapoint)
    dropCountMetric, err := meter.Int64ObservableCounter("dropCount")
    check(err)
    targetCountMetric, err := meter.Int64ObservableCounter("targetCount")
    check(err)
    rttMetric, err := meter.Float64ObservableGauge("latency")
    check(err)
    _, err = meter.RegisterCallback(
        func(ctx context.Context, o metric.Observer) error {
            mu.Lock()
            for _, v := range(datapointSummary) {
                rtt := float64(0)
                if v.rttCount > 0 {
                    rtt = v.rttSum/float64(v.rttCount)
                }
                o.ObserveFloat64 (rttMetric, rtt, metric.WithAttributes(attribute.String("mesh", *mesh), attribute.String("test_type", "udping"), attribute.String("from_host", v.from_host), attribute.String("to_host", v.to_host)))
                v.rttSum = 0
                v.rttCount = 0
            }
            mu.Unlock()
            return nil
        }, rttMetric)
    check(err)
    _, err = meter.RegisterCallback(
        func(ctx context.Context, o metric.Observer) error {
            mu.Lock()
            for _, v := range(datapointSummary) {
                o.ObserveInt64 (dropCountMetric, int64(v.dropCount), metric.WithAttributes(attribute.String("mesh", *mesh), attribute.String("test_type", "udping"), attribute.String("from_host", v.from_host), attribute.String("to_host", v.to_host)))
                v.dropCount = 0
            }
            mu.Unlock()
            return nil
        }, dropCountMetric)
    check(err)
    _, err = meter.RegisterCallback(
        func(ctx context.Context, o metric.Observer) error {
            mu.Lock()
            for _, v := range(datapointSummary) {
                o.ObserveInt64 (targetCountMetric, int64(v.targetCount), metric.WithAttributes(attribute.String("mesh", *mesh), attribute.String("test_type", "udping"), attribute.String("from_host", v.from_host), attribute.String("to_host", v.to_host)))
                v.targetCount = 0
            }
            mu.Unlock()
            return nil
        }, targetCountMetric)
    check(err)

    scanner := bufio.NewScanner(os.Stdin)
    for scanner.Scan() {
        buf := scanner.Text()
        var obj map[string]string
        err := json.Unmarshal([]byte(buf), &obj)
        check(err)
        sum, err := strconv.ParseFloat(obj["sum"], 64)
        if err != nil {
            fmt.Fprintln(os.Stderr, "Error converting sum: ", err)
            continue
        }
        count, err := strconv.Atoi(obj["count"])
        if err != nil {
            fmt.Fprintln(os.Stderr, "Error converting count: ", err)
            continue
        }
        targetCount, err := strconv.Atoi(obj["targetCount"])
        if err != nil {
            fmt.Fprintln(os.Stderr, "Error converting targetCount: ", err)
            continue
        }
        key := obj["from_host"] + "-" + obj["to_host"]
        _, found := datapointSummary[key]
        mu.Lock()
        if !found {
            datapointSummary[key] = &datapoint{obj["from_host"], obj["to_host"], 0, 0, 0, 0}
        }
        datapointSummary[key].targetCount += targetCount
        datapointSummary[key].dropCount += targetCount - count
        datapointSummary[key].rttCount += count
        datapointSummary[key].rttSum += sum
        mu.Unlock()
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

    // handleErr calls shutdown for cleanup and makes sure that all errors are returned.
    handleErr := func(inErr error) {
        err = errors.Join(inErr, shutdown(ctx))
    }

    // Set up meter provider.
    meterProvider, err := newMeterProvider(ctx)
    if err != nil {
        handleErr(err)
        return
    }
    shutdownFuncs = append(shutdownFuncs, meterProvider.Shutdown)
    otel.SetMeterProvider(meterProvider)

    return
}

func newMeterProvider(ctx context.Context) (*sdkmetric.MeterProvider, error) {
    httpExporter, err := otlpmetrichttp.New(ctx, otlpmetrichttp.WithInsecure())
    stdoutExporter, err := stdoutmetric.New()
    if err != nil {
        return nil, err
    }

    meterProvider := sdkmetric.NewMeterProvider( sdkmetric.WithReader(sdkmetric.NewPeriodicReader(httpExporter, sdkmetric.WithInterval(30*time.Second))), sdkmetric.WithReader(sdkmetric.NewPeriodicReader(stdoutExporter, sdkmetric.WithInterval(30*time.Second))))
    return meterProvider, nil
}

