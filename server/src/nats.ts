import { connect, NatsConnection, JetStreamClient, JSONCodec } from 'nats';

let natsConnection: NatsConnection | null = null;
let jsClient: JetStreamClient | null = null;
const jc = JSONCodec();

export async function initNats(): Promise<void> {
  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
  try {
    console.log(`🌐 [NATS] Connecting to NATS server at ${natsUrl}...`);
    natsConnection = await connect({ servers: natsUrl, timeout: 3000 });
    console.log(`✅ [NATS] Connected to NATS!`);

    // Initialize JetStream
    jsClient = natsConnection.jetstream();

    // Configure JetStream stream
    const jsm = await natsConnection.jetstreamManager();
    const streamName = 'MARKETPLACE';
    const subjects = ['marketplace.>'];

    try {
      await jsm.streams.info(streamName);
      console.log(`ℹ️ [NATS] Stream '${streamName}' already exists.`);
    } catch (err) {
      // Stream doesn't exist, create it
      console.log(`🌐 [NATS] Creating stream '${streamName}' with subjects:`, subjects);
      await jsm.streams.add({
        name: streamName,
        subjects: subjects,
        max_msgs: 10000,
      });
      console.log(`✅ [NATS] Stream '${streamName}' created!`);
    }
  } catch (err: any) {
    console.warn(`⚠️ [NATS] Failed to connect or initialize NATS stream:`, err.message);
    console.warn(`⚠️ [NATS] Running in real-time fallback mode (No-Op).`);
    natsConnection = null;
    jsClient = null;
  }
}

export async function publishEvent(subject: string, payload: any): Promise<void> {
  if (!jsClient) {
    return;
  }
  try {
    const data = jc.encode(payload);
    await jsClient.publish(subject, data);
    console.log(`📡 [NATS] Event published to subject: ${subject}`);
  } catch (err: any) {
    console.error(`❌ [NATS] Failed to publish event to ${subject}:`, err.message);
  }
}

export function getNatsConnection(): NatsConnection | null {
  return natsConnection;
}
