import { Kafka, type Consumer, type Producer } from "kafkajs";
import { KAFKA_TOPICS } from "@sourceiq/shared";

export { KAFKA_TOPICS };

type Handler = (payload: unknown) => Promise<void>;

const memoryHandlers = new Map<string, Handler[]>();

let producer: Producer | null = null;
let kafka: Kafka | null = null;
let useKafka = process.env.USE_KAFKA === "true" && Boolean(process.env.KAFKA_BROKERS);

export function isKafkaEnabled() {
  return useKafka;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export async function connectKafka() {
  if (!useKafka) return;
  const timeoutMs = Number(process.env.KAFKA_CONNECT_TIMEOUT_MS ?? 3000);
  try {
    kafka = new Kafka({
      clientId: "sourceiq-api",
      brokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
      connectionTimeout: timeoutMs,
      requestTimeout: timeoutMs,
      retry: { retries: 0 },
    });
    producer = kafka.producer();
    await withTimeout(producer.connect(), timeoutMs, "Kafka connect");
  } catch (e) {
    console.warn("[kafka] unavailable, using in-memory bus", e);
    useKafka = false;
    producer = null;
    kafka = null;
  }
}

export async function publish(topic: string, message: unknown, key?: string) {
  const payload = JSON.stringify(message);
  if (useKafka && producer) {
    await producer.send({
      topic,
      messages: [{ key, value: payload }],
    });
    return;
  }
  const handlers = memoryHandlers.get(topic) ?? [];
  const parsed = JSON.parse(payload);
  await Promise.all(handlers.map((h) => h(parsed)));
}

export async function subscribe(topic: string, handler: Handler): Promise<Consumer | null> {
  if (!useKafka || !kafka) {
    const list = memoryHandlers.get(topic) ?? [];
    list.push(handler);
    memoryHandlers.set(topic, list);
    return null;
  }
  const consumer = kafka.consumer({ groupId: `sourceiq-${topic}` });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      await handler(JSON.parse(message.value.toString()));
    },
  });
  return consumer;
}

export async function disconnectKafka() {
  if (producer) await producer.disconnect();
}
