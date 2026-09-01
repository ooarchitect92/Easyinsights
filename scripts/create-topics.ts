import { Kafka, logLevel } from 'kafkajs';
import { config } from '@easyinsights/core';
const kafka = new Kafka({
  clientId: `${config.kafkaClientId}-bootstrap`,
  brokers: config.kafkaBrokers,
  logLevel: logLevel.NOTHING,
});
const admin = kafka.admin();
await admin.connect();
const topics = [
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
];
await admin.createTopics({
  waitForLeaders: true,
  topics: topics.map((topic) => ({
    topic,
    numPartitions: 6,
    replicationFactor: 1,
    configEntries: [
      {
        name: 'cleanup.policy',
        value: topic === 'easyinsights.dead-letter' ? 'compact,delete' : 'delete',
      },
      {
        name: 'retention.ms',
        value: topic === 'easyinsights.dead-letter' ? '2592000000' : '604800000',
      },
    ],
  })),
});
await admin.disconnect();
console.log(JSON.stringify({ status: 'ok', topics }));
