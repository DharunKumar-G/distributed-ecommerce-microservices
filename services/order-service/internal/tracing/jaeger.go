package tracing

import (
	"fmt"
	"io"

	"github.com/opentracing/opentracing-go"
	"github.com/uber/jaeger-client-go"
	"github.com/uber/jaeger-client-go/config"
)

func InitJaeger(serviceName, agentHost string, agentPort int) io.Closer {
	cfg := &config.Configuration{
		ServiceName: serviceName,
		Sampler: &config.SamplerConfig{
			Type:  jaeger.SamplerTypeConst,
			Param: 1,
		},
		Reporter: &config.ReporterConfig{
			LogSpans:           true,
			LocalAgentHostPort: fmt.Sprintf("%s:%d", agentHost, agentPort),
		},
	}

	tracer, closer, err := cfg.NewTracer()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize tracer: %s", err.Error()))
	}

	opentracing.SetGlobalTracer(tracer)
	return closer
}
