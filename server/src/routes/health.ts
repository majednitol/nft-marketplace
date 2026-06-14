import { FastifyInstance } from 'fastify';
import { pool } from '../db/client';
import { redis } from '../redis/client';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = `error: ${e.message}`;
    }

    try {
      const ping = await redis.ping();
      if (ping === 'PONG') {
        redisStatus = 'connected';
      }
    } catch (e: any) {
      redisStatus = `error: ${e.message}`;
    }

    const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';

    reply.code(isHealthy ? 200 : 500).send({
      status: isHealthy ? 'healthy' : 'unhealthy',
      database: dbStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  });
}
