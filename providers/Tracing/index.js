const opentelemetry = require("@opentelemetry/sdk-node");
const {
    getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
    OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { Resource } = require("@opentelemetry/resources");
const {
    AsyncLocalStorageContextManager,
} = require("@opentelemetry/context-async-hooks");
const {
    CompositePropagator,
    W3CTraceContextPropagator,
    W3CBaggagePropagator,
} = require("@opentelemetry/core");
const {
    B3InjectEncoding,
    B3Propagator,
} = require("@opentelemetry/propagator-b3");

class OtelTracing {
    constructor(Config) {
        const traceExporter = new OTLPTraceExporter({
            url: Config.url,
            headers: {
                authorization: Config.apiKey,
            },
            compression: "gzip",
        });

        this.sdk = new opentelemetry.NodeSDK({
            resource: new Resource({
                [ATTR_SERVICE_NAME]: Config.serviceName,
            }),
            contextManager: new AsyncLocalStorageContextManager(),
            textMapPropagator: new CompositePropagator({
                propagators: [
                    new W3CTraceContextPropagator(),
                    new W3CBaggagePropagator(),
                    new B3Propagator(),
                    new B3Propagator({
                        injectEncoding: B3InjectEncoding.MULTI_HEADER,
                    }),
                ],
            }),
            spanProcessor: new BatchSpanProcessor(traceExporter),
            instrumentations: [getNodeAutoInstrumentations()],
        });
    }

    start() {
        return this.sdk.start();
    }

    shutdown() {
        return this.sdk
            .shutdown()
            .then(() => console.log("Tracing terminated"))
            .catch((error) => console.log("Error terminating tracing", error));
    }

    getSdk() {
        return this.sdk;
    }
}

module.exports = OtelTracing;
