import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
if (endpoint) {
  const resource = new Resource({ [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'mfs-portal-api' });
  const sdk = new NodeSDK({ resource, traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }) });
  void sdk.start();
  process.on('SIGTERM', () => { void sdk.shutdown(); });
}
