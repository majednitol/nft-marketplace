import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import { config } from './config';
import { initDb } from './db/client';
import { initNats, getNatsConnection } from './nats';
import { runBackfill, startLiveIndexer } from './indexer/indexer';
import { runEVMBackfill, startLiveEVMIndexer } from './indexer/evmIndexer';
import { healthRoutes } from './routes/health';
import { listingsRoutes } from './routes/listings';
import { statsRoutes } from './routes/stats';
import { adminRoutes } from './routes/admin';
import { nftsRoutes } from './routes/nfts';

const app = fastify({ 
  logger: true,
  bodyLimit: 50 * 1024 * 1024 // 50MB limit for base64 image/audio/video payloads
});

async function start() {
  try {
    // 0. Initialize NATS + JetStream stream
    await initNats();

    // 1. Configure CORS
    await app.register(cors, {
      origin: true, // Allow all origins for dev simplicity
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    });

    // 1.1 Configure WebSockets
    await app.register(fastifyWebsocket);

    // 2. Register health check, listings, stats, admin, and nfts routes
    // Prefix endpoints with /api
    await app.register(healthRoutes, { prefix: '/api' });
    await app.register(listingsRoutes, { prefix: '/api' });
    await app.register(statsRoutes, { prefix: '/api' });
    await app.register(adminRoutes, { prefix: '/api' });
    await app.register(nftsRoutes, { prefix: '/api' });
    
    // WebSocket endpoint for real-time events
    app.route({
      method: 'GET',
      url: '/api/ws',
      handler: (req, reply) => {
        reply.code(400).send({ error: 'Only WebSocket connections are allowed at this endpoint' });
      },
      wsHandler: (connection, req) => {
        console.log(`🔌 [WS Gateway] Client connected to WebSocket!`);
        
        const natsConn = getNatsConnection();
        let natsSubscription: any = null;

        if (natsConn) {
          try {
            natsSubscription = natsConn.subscribe('marketplace.>');
            
            (async () => {
              for await (const msg of natsSubscription) {
                try {
                  const subject = msg.subject;
                  const dataStr = new TextDecoder().decode(msg.data);
                  const payload = JSON.parse(dataStr);

                  console.log(`🔌 [WS Gateway] Relay event from NATS: ${subject}`);
                  connection.socket.send(JSON.stringify({
                    subject,
                    payload
                  }));
                } catch (parseErr: any) {
                  console.error('Failed to parse NATS message:', parseErr.message);
                }
              }
            })().catch(err => {
              console.error('NATS subscription relay error:', err);
            });
          } catch (subErr: any) {
            console.error('Failed to subscribe to NATS in WebSocket gateway:', subErr.message);
          }
        } else {
          console.warn('⚠️ [WS Gateway] NATS is running in No-Op fallback mode. WS will not relay events.');
        }

        connection.socket.on('close', () => {
          console.log(`🔌 [WS Gateway] Client disconnected from WebSocket`);
          if (natsSubscription) {
            try {
              natsSubscription.unsubscribe();
              console.log(`🔌 [WS Gateway] Cleaned up NATS subscription`);
            } catch (err) {
              console.error('Error cleaning up NATS subscription:', err);
            }
          }
        });

        connection.socket.on('error', (err) => {
          console.error(`🔌 [WS Gateway] WebSocket error:`, err.message);
        });
      }
    });

    // 3. Initialize Postgres schema
    await initDb();

    // 4. Run Solana backfill sync
    await runBackfill();

    // 4.1 Run EVM backfill sync
    await runEVMBackfill();

    // 5. Start live event indexer
    startLiveIndexer();

    // 5.1 Start live EVM event indexer
    startLiveEVMIndexer();

    // 6. Start server listening
    const address = await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Backend server successfully listening at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
