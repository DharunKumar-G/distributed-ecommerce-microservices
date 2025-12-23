import { initTracer, JaegerTracer } from 'jaeger-client';
import { logger } from './logger';

let tracer: JaegerTracer;

export function initTracing(serviceName: string): JaegerTracer {
  const config = {
    serviceName,
    sampler: {
      type: 'const',
      param: 1
    },
    reporter: {
      logSpans: true,
      agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
      agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6831')
    }
  };

  const options = {
    logger: {
      info: (msg: string) => logger.info(msg),
      error: (msg: string) => logger.error(msg)
    }
  };

  tracer = initTracer(config, options);
  logger.info('Jaeger tracer initialized');

  return tracer;
}

export function getTracer(): JaegerTracer {
  return tracer;
}
