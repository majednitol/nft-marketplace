import { FastifyInstance } from 'fastify';
import { pool } from '../db/client';
import { redis } from '../redis/client';

function normalizeAddress(addr: string): string {
  if (typeof addr === 'string' && addr.toLowerCase().startsWith('0x')) {
    return addr.toLowerCase();
  }
  return addr;
}

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get('/stats/:marketplace', async (request: any, reply) => {
    const { marketplace } = request.params;
    const normalizedMarketplace = normalizeAddress(marketplace);
    const cacheKey = `stats:${normalizedMarketplace}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        reply.header('X-Cache', 'HIT');
        return JSON.parse(cached);
      }
    } catch (cacheErr) {
      console.warn('Redis read failed in stats route:', cacheErr);
    }

    try {
      // 1. Get active listings count and floor price
      const activeQuery = `
        SELECT COUNT(*)::int as count, MIN(price) as floor
        FROM listings
        WHERE marketplace_address = $1 AND status = 'active'
      `;
      const activeResult = await pool.query(activeQuery, [normalizedMarketplace]);
      const activeCount = activeResult.rows[0].count || 0;
      const floorPrice = activeResult.rows[0].floor ? activeResult.rows[0].floor.toString() : '0';

      // 2. Get volume and sales count
      const salesQuery = `
        SELECT COUNT(*)::int as sales, COALESCE(SUM(price), 0) as volume
        FROM listings
        WHERE marketplace_address = $1 AND status = 'sold'
      `;
      const salesResult = await pool.query(salesQuery, [normalizedMarketplace]);
      const salesCount = salesResult.rows[0].sales || 0;
      const volume = salesResult.rows[0].volume ? salesResult.rows[0].volume.toString() : '0';

      // 3. Get rate limit
      const rateLimitQuery = `
        SELECT rate_limit FROM marketplaces WHERE address = $1
      `;
      const rateLimitResult = await pool.query(rateLimitQuery, [normalizedMarketplace]);
      const rateLimit = rateLimitResult.rows[0] ? rateLimitResult.rows[0].rate_limit : 100;

      const stats = {
        marketplaceAddress: normalizedMarketplace,
        activeListingsCount: activeCount,
        floorPrice,
        totalVolume: volume,
        salesCount,
        rateLimit,
        timestamp: new Date().toISOString(),
      };

      try {
        // Cache stats for 1 hour or until invalidated by indexer
        await redis.setex(cacheKey, 3600, JSON.stringify(stats));
      } catch (cacheErr) {
        console.warn('Redis write failed in stats route:', cacheErr);
      }

      reply.header('X-Cache', 'MISS');
      return stats;
    } catch (dbErr) {
      console.error(`Database query error in GET /stats/${marketplace}:`, dbErr);
      reply.code(500).send({ error: 'Database query failed' });
    }
  });
}
