const { Kafka } = require("kafkajs");

class KafkaProducer {
    constructor(Config) {
        this.kafka = new Kafka({
            brokers: Config.get("kafka.brokers"),
            clientId: Config.get("kafka.clientId"),
        });

        this.producer = this.kafka.producer({
            idempotent: true,
        });
        this.producer.connect();
    }

    /**
     * Sends a message to a specified Kafka topic.
     *
     * @param {string} topic - The Kafka topic to which the message will be sent.
     * @param {string|object} message - The message to be sent. If an object is provided, it will be stringified.
     * @param {object} [options] - Additional options for the message.
     * @returns {Promise} - A promise that resolves when the message is sent.
     *
     * @example
     * // Sending a simple string message
     * await sendMessage('my-topic', 'Hello, Kafka!');
     *
     * @example
     * // Sending a JSON object as a message
     * const message = { key: 'value', anotherKey: 123 };
     * await sendMessage('my-topic', message);
     *
     * @example
     * // Sending a message with additional options
     * const options = { key: 'my-key' };
     * await sendMessage('my-topic', 'Hello, Kafka!', options);
     */
    async sendMessage(topic, message, options) {
        // if (!this.producer.isIdempotent()) {
        //     await this.producer.connect();
        // }

        let value;
        if (typeof message === "object") {
            value = JSON.stringify(message);
        } else {
            value = message;
        }

        return await this.producer.send({
            topic,
            messages: [{ value, ...options }],
        });
    }


    /**
     * Sends messages to a specified Kafka topic.
     *
     * @param {string} topic - The Kafka topic to send messages to.
     * @param {Array<string|Object>} messages - An array of messages to send. Each message can be a string or an object.
     * @param {Object} [options] - Optional configurations to include with each message.
     * @returns {Promise} - A promise that resolves when the messages have been sent.
     *
     * @example
     * const kafkaProvider = new KafkaProvider();
     * const topic = 'example-topic';
     * const messages = [
     *   { key: 'key1', value: 'message1' },
     *   { key: 'key2', value: { foo: 'bar' } }
     * ];
     * const options = { partition: 0 };
     *
     * kafkaProvider.sendMessages(topic, messages, options)
     *   .then(() => {
     *     console.log('Messages sent successfully');
     *   })
     *   .catch((error) => {
     *     console.error('Error sending messages:', error);
     *   });
     */
    async sendMessages(topic, messages, options) {
        // if (!this.producer.isIdempotent()) {
        //     await this.producer.connect();
        // }

        if (!Array.isArray(messages)) {
            throw new Error("Messages must be an array");
        }

        messages = messages.map((message) => {
            if (typeof message === "object") {
                return { value: JSON.stringify(message), ...options };
            }

            return { value: message, ...options };
        });

        return await this.producer.send({
            topic,
            messages,
        });
    }
}

module.exports = KafkaProducer;
