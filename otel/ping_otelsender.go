package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "time"
    "os/signal"
    "strings"
    "flag"

    "context"
    "errors"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
    "go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
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
    from_host := flag.String("from_host", "", "From Host")
    to_host := flag.String("to_host", "", "To Host")
    mesh := flag.String("mesh", "", "Mesh")
    flag.Parse()
    if *from_host == "" || *to_host == "" || *mesh == ""{
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
    var meter = otel.Meter("ping")
    targetCount := 0
    count := 0
    rttCount := 0
    rttSum := float64(0)
    countMetric, err := meter.Int64ObservableCounter("count")
    check(err)
    targetCountMetric, err := meter.Int64ObservableCounter("targetCount")
    check(err)
    rttMetric, err := meter.Float64ObservableGauge("rtt")
    check(err)
    _, err = meter.RegisterCallback(
        func(ctx context.Context, o metric.Observer) error {
            rtt := float64(0)
            if rttCount > 0 {
                rtt = rttSum / float64(rttCount)
                rttSum = 0
                rttCount = 0
            }
            o.ObserveFloat64 (rttMetric, rtt, metric.WithAttributes(attribute.String("test_type", "ping"), attribute.String("from_host", *from_host), attribute.String("to_host", *to_host), attribute.String("mesh", *mesh)))
            return nil
        }, rttMetric)
    check(err)
    _, err = meter.RegisterCallback(
        func(ctx context.Context, o metric.Observer) error {
            o.ObserveInt64 (countMetric, int64(count), metric.WithAttributes(attribute.String("test_type", "ping"), attribute.String("from_host", *from_host), attribute.String("to_host", *to_host), attribute.String("mesh", *mesh)))
            count = 0
            return nil
        }, countMetric)
    check(err)
    _, err = meter.RegisterCallback(
        func(ctx context.Context, o metric.Observer) error {
            o.ObserveInt64 (targetCountMetric, int64(targetCount), metric.WithAttributes(attribute.String("test_type", "ping"), attribute.String("from_host", *from_host), attribute.String("to_host", *to_host), attribute.String("mesh", *mesh)))
            targetCount = 0
            return nil
        }, targetCountMetric)
    check(err)

    scanner := bufio.NewScanner(os.Stdin)
    // scanner := bufio.NewScanner(f)
    for scanner.Scan() {
        buf := scanner.Text()
        //fmt.Println(buf)
        if strings.Index(buf, "Unreachable") > -1 {
            targetCount += 1
            fmt.Println ("Sent: 1, Received: 0")
        } else if timeix := strings.Index(buf, "time="); timeix > -1 {
            field := strings.Split(buf[timeix:], " ")[0]
            rtt, err := strconv.ParseFloat(strings.Split(field, "=")[1], 64)
            check(err)
            // fmt.Println(rtt)
            targetCount += 1
            count += 1
            rttCount += 1
            rttSum += rtt
        } else {
            fmt.Println(buf)
            fmt.Println("Ignore")
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

