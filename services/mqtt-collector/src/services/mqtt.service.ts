import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { mqttLogger } from "../utils/logger";
import { config } from "../config/env";
import { validateMessage, parseTopic } from "../types/message.types";
import { databaseService } from "./database.service";

export class MQTTService {
    private client: MqttClient | null = null;
    private isConnected = false;
    private messageCount = 0;
    private errorCount = 0;

    /**
     * Connect to MQTT broker
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const options: IClientOptions = {
                clientId: config.mqtt.clientId,
                clean: true,
                keepalive: config.mqtt.keepalive,
                reconnectPeriod: config.mqtt.reconnectPeriod,
                connectTimeout: 30000,

                // Authentication
                username: config.mqtt.username || undefined,
                password: config.mqtt.password || undefined,

                // Will message (for monitoring)
                will: {
                    topic: "sundaya/collector/status",
                    payload: JSON.stringify({
                        status: "offline",
                        timestamp: new Date().toISOString(),
                    }),
                    qos: 1,
                    retain: true,
                },
            };

            mqttLogger.info(
                { broker: config.mqtt.brokerUrl },
                "Connecting to MQTT broker"
            );

            this.client = mqtt.connect(config.mqtt.brokerUrl, options);

            // Connection event handlers
            this.client.on("connect", () => {
                this.isConnected = true;
                mqttLogger.info("Connected to MQTT broker");

                // Publish online status
                this.publishStatus("online");

                // Subscribe to topics
                this.subscribe();

                resolve();
            });

            this.client.on("reconnect", () => {
                mqttLogger.warn("Reconnecting to MQTT broker");
            });

            this.client.on("disconnect", () => {
                this.isConnected = false;
                mqttLogger.warn("Disconnected from MQTT broker");
            });

            this.client.on("offline", () => {
                this.isConnected = false;
                mqttLogger.warn("MQTT client is offline");
            });

            this.client.on("error", (error) => {
                this.errorCount++;
                mqttLogger.error({ error }, "MQTT client error");
                reject(error);
            });

            // Message handler
            this.client.on("message", async (topic, payload) => {
                await this.handleMessage(topic, payload);
            });
        });
    }

    /**
     * Subscribe to MQTT topics
     */
    private subscribe(): void {
        if (!this.client) {
            mqttLogger.error("Cannot subscribe: client not initialized");
            return;
        }

        const topic = config.mqtt.topicPattern;

        this.client.subscribe(
            topic,
            { qos: config.mqtt.qos },
            (error, granted) => {
                if (error) {
                    mqttLogger.error(
                        { error, topic },
                        "Failed to subscribe to topic"
                    );
                    return;
                }

                mqttLogger.info(
                    {
                        subscriptions: granted?.map((g) => ({
                            topic: g.topic,
                            qos: g.qos,
                        })),
                    },
                    "Subscribed to MQTT topics"
                );
            }
        );
    }

    /**
     * Handle incoming MQTT message
     */
    private async handleMessage(topic: string, payload: Buffer): Promise<void> {
        const startTime = Date.now();

        try {
            // Parse topic
            const topicParts = parseTopic(topic);
            if (!topicParts) {
                mqttLogger.warn({ topic }, "Invalid topic format");
                return;
            }

            // Parse JSON payload
            let jsonPayload: unknown;
            try {
                jsonPayload = JSON.parse(payload.toString());
            } catch (error) {
                mqttLogger.error(
                    { topic, error },
                    "Failed to parse JSON payload"
                );
                this.errorCount++;
                return;
            }

            // Validate message structure
            const validation = validateMessage(jsonPayload);
            if (!validation.success) {
                mqttLogger.warn(
                    {
                        topic,
                        error: validation.error,
                    },
                    "Invalid message structure"
                );
                this.errorCount++;
                return;
            }

            // Verify site_id matches topic (skip if topic doesn't include site_id)
            if (topicParts.siteId !== "mqtt" && validation.data!.sites.site_id !== topicParts.siteId) {
                mqttLogger.warn(
                    {
                        topic,
                        payloadSiteId: validation.data!.sites.site_id,
                        topicSiteId: topicParts.siteId,
                    },
                    "Site ID mismatch between topic and payload"
                );
                this.errorCount++;
                return;
            }

            // Save to database
            await databaseService.saveMqttMessage(validation.data!, topic);

            this.messageCount++;

            const duration = Date.now() - startTime;
            mqttLogger.info(
                {
                    topic,
                    siteId: validation.data!.sites.site_id,
                    dataType: validation.data!.data_type,
                    duration: `${duration}ms`,
                    totalProcessed: this.messageCount,
                },
                "Message processed successfully"
            );
        } catch (error) {
            this.errorCount++;
            mqttLogger.error(
                {
                    topic,
                    error,
                    duration: `${Date.now() - startTime}ms`,
                },
                "Failed to process message"
            );
        }
    }

    /**
     * Publish status message
     */
    private publishStatus(status: "online" | "offline"): void {
        if (!this.client) return;

        const message = {
            status,
            timestamp: new Date().toISOString(),
            messageCount: this.messageCount,
            errorCount: this.errorCount,
        };

        this.client.publish(
            "sundaya/collector/status",
            JSON.stringify(message),
            { qos: 1, retain: true },
            (error) => {
                if (error) {
                    mqttLogger.error({ error }, "Failed to publish status");
                } else {
                    mqttLogger.debug({ status }, "Published status");
                }
            }
        );
    }

    /**
     * Disconnect from MQTT broker
     */
    async disconnect(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.client) {
                resolve();
                return;
            }

            mqttLogger.info("Disconnecting from MQTT broker");

            // Publish offline status
            this.publishStatus("offline");

            // Wait a bit for the message to be sent
            setTimeout(() => {
                this.client!.end(false, {}, () => {
                    this.isConnected = false;
                    mqttLogger.info("Disconnected from MQTT broker");
                    resolve();
                });
            }, 500);
        });
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            messageCount: this.messageCount,
            errorCount: this.errorCount,
        };
    }

    /**
     * Reset counters
     */
    resetCounters(): void {
        this.messageCount = 0;
        this.errorCount = 0;
        mqttLogger.info("Counters reset");
    }
}

// Export singleton instance
export const mqttService = new MQTTService();
