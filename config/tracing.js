const path = require("path");
const Env = use("Env");

const Helpers = use("Helpers");

module.exports = {
    enable: Env.get("TRACING_ENABLE", "false") === "true",

    url: Env.get("TRACING_URL", "http://localhost:4318/v1/traces"),

    apiKey: Env.get("TRACING_API_KEY", ""),

    serviceName: Env.get("TRACING_SERVICE_NAME", "na3-futures-service"),
};
