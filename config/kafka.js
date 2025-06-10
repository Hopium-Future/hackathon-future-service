// const path = require("path");
const Env = use("Env");

module.exports = {
    brokers: Env.get("KAFKA_BROKERS", "kafka1:9092,kafka2:9092").split(","),

    clientId: Env.get("KAFKA_ClIENT_ID", "na3-futures-service"),
};
