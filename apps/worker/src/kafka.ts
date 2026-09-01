import { Kafka, logLevel, type Consumer, type Producer } from 'kafkajs';
import { config } from '@easyinsights/core';
export const topics = [
  'easyinsights.events.canonical',
  'easyinsights.commands.attribution',
  'easyinsights.commands.audience',
  'easyinsights.commands.workflow',
  'easyinsights.commands.agent',
  'easyinsights.commands.connector',
  'easyinsights.commands.activation',
  'easyinsights.commands.report',
  'easyinsights.events.approval',
  'easyinsights.dead-letter',
] as const;
function kafka(clientSuffix: string) {
  return new Kafka({
    clientId: `${config.kafkaClientId}-${clientSuffix}`,
    brokers: config.kafkaBrokers,
    logLevel: logLevel.NOTHING,
    connectionTimeout: 5000,
    requestTimeout: 30000,
    retry: { initialRetryTime: 300, retries: 8 },
  });
}
export async function createProducer(suffix = 'producer'): Promise<Producer> {
  const producer = kafka(suffix).producer({
    allowAutoTopicCreation: false,
    idempotent: true,
    maxInFlightRequests: 1,
    transactionTimeout: 30000,
  });
  await producer.connect();
  return producer;
}
export async function createConsumer(): Promise<Consumer> {
  const consumer = kafka('consumer').consumer({
    groupId: config.kafkaGroupId,
    allowAutoTopicCreation: false,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 1048576,
  });
  await consumer.connect();
  return consumer;
}
