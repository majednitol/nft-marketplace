import { FastifyInstance } from 'fastify';
import { pool } from '../db/client';
import { redis } from '../redis/client';

function parsePrice(price: any): number {
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    if (price.startsWith('0x') || /[a-f]/i.test(price)) {
      return parseInt(price, 16);
    }
    return parseFloat(price);
  }
  return 0;
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Normalize EVM marketplace address parameter to lowercase
  fastify.addHook('preHandler', async (request: any) => {
    if (request.params && request.params.marketplace) {
      const mp = request.params.marketplace;
      if (typeof mp === 'string' && mp.toLowerCase().startsWith('0x')) {
        request.params.marketplace = mp.toLowerCase();
      }
    }
  });

  // GET /admin/:marketplace/stats
  fastify.get('/admin/:marketplace/stats', async (request: any, reply) => {
    const { marketplace } = request.params;
    const isEvm = marketplace.toLowerCase().startsWith('0x');
    const divider = isEvm ? 1e18 : 1e9;
    const currency = isEvm ? 'ETH' : 'SOL';
    
    try {
      // 1. Get total revenue (fee_bps * volume of sold listings)
      const revenueQuery = `
        SELECT COALESCE(SUM(l.price * m.fee_bps / 10000.0), 0) as revenue
        FROM listings l
        JOIN marketplaces m ON l.marketplace_address = m.address
        WHERE l.marketplace_address = $1 AND l.status = 'sold'
      `;
      const revenueResult = await pool.query(revenueQuery, [marketplace]);
      const totalRevenueLamports = revenueResult.rows[0].revenue || 0;
      const totalRevenue = parseFloat(totalRevenueLamports) / divider;

      // 2. Get total transactions count
      const transactionsQuery = `
        SELECT COUNT(*)::int as count
        FROM marketplace_events
        WHERE data->>'marketplace' = $1
      `;
      const transactionsResult = await pool.query(transactionsQuery, [marketplace]);
      const totalTransactions = transactionsResult.rows[0].count || 0;

      // 3. Get active users count
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT user_address)::int as active_users
        FROM (
          SELECT data->>'buyer' as user_address FROM marketplace_events WHERE data->>'marketplace' = $1 AND data->>'buyer' IS NOT NULL
          UNION
          SELECT data->>'seller' as user_address FROM marketplace_events WHERE data->>'marketplace' = $1 AND data->>'seller' IS NOT NULL
        ) users
      `;
      const activeUsersResult = await pool.query(activeUsersQuery, [marketplace]);
      const activeUsersCount = activeUsersResult.rows[0].active_users || 0;

      // 4. Get recent activity
      const activityQuery = `
        SELECT id, event_type, tx_signature, block_time, data
        FROM marketplace_events
        WHERE data->>'marketplace' = $1
        ORDER BY block_time DESC
        LIMIT 10
      `;
      const activityResult = await pool.query(activityQuery, [marketplace]);
      const recentActivity = activityResult.rows.map(row => {
        const type = row.event_type === 'NFTListed' ? 'list' :
                     row.event_type === 'NFTPurchased' ? 'sale' :
                     row.event_type === 'NFTDelisted' ? 'delist' :
                     row.event_type === 'FeeUpdated' ? 'fee_update' :
                     row.event_type === 'InitializeMarketplace' ? 'initialize' : 'unknown';

        let details = '';
        let severity = 'info';
        let user = '';
        
        if (row.event_type === 'NFTListed') {
          details = `NFT listed for ${parsePrice(row.data.price) / divider} ${currency}`;
          user = row.data.seller;
          severity = 'info';
        } else if (row.event_type === 'NFTPurchased') {
          details = `NFT purchased for ${parsePrice(row.data.price) / divider} ${currency}`;
          user = row.data.buyer;
          severity = 'success';
        } else if (row.event_type === 'NFTDelisted') {
          details = `NFT delisted`;
          user = row.data.seller || 'Seller';
          severity = 'warning';
        } else if (row.event_type === 'FeeUpdated') {
          const newFee = row.data.new_fee !== undefined ? row.data.new_fee : row.data.newFee;
          details = `Updated marketplace fee to ${newFee !== undefined ? (newFee / 100).toFixed(2) + '%' : 'NaN%'}`;
          user = 'Admin';
          severity = 'info';
        } else if (row.event_type === 'InitializeMarketplace') {
          const fee = row.data.fee !== undefined ? row.data.fee : row.data.fee_bps;
          details = `Initialized marketplace "${row.data.name}" with fee ${fee !== undefined ? (fee / 100).toFixed(2) + '%' : 'NaN%'}`;
          user = 'Admin';
          severity = 'success';
        }

        return {
          id: row.id.toString(),
          type,
          user,
          details,
          timestamp: parseInt(row.block_time, 10) * 1000,
          severity
        };
      });

      // 5. Get top users (aggregated in JavaScript to handle hex prices)
      const topUsersEventsQuery = `
        SELECT data->>'buyer' as buyer, data->>'seller' as seller, data->>'price' as price
        FROM marketplace_events
        WHERE event_type = 'NFTPurchased' AND data->>'marketplace' = $1
      `;
      const topUsersEventsResult = await pool.query(topUsersEventsQuery, [marketplace]);
      
      const userVolumeMap: Record<string, number> = {};
      const userTradesMap: Record<string, number> = {};
      
      for (const eventRow of topUsersEventsResult.rows) {
        const price = parsePrice(eventRow.price);
        const buyer = eventRow.buyer;
        const seller = eventRow.seller;
        
        if (buyer) {
          userVolumeMap[buyer] = (userVolumeMap[buyer] || 0) + price;
          userTradesMap[buyer] = (userTradesMap[buyer] || 0) + 1;
        }
        if (seller) {
          userVolumeMap[seller] = (userVolumeMap[seller] || 0) + price;
          userTradesMap[seller] = (userTradesMap[seller] || 0) + 1;
        }
      }
      
      const topUsers = Object.keys(userVolumeMap)
        .map(address => ({
          address,
          volume: userVolumeMap[address],
          tradeCount: userTradesMap[address] || 0
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5)
        .map((user, index) => ({
          id: (index + 1).toString(),
          address: user.address,
          volume: user.volume / divider,
          totalTrades: user.tradeCount,
          reputation: Math.min(5.0, 4.0 + (user.tradeCount * 0.1)),
          status: 'active'
        }));

      return {
        totalRevenue,
        totalTransactions,
        activeUsersCount,
        pendingReports: 0,
        blockedUsers: 0,
        systemStatus: 'Operational',
        recentActivity,
        topUsers
      };
    } catch (err) {
      console.error('Error fetching admin overview stats:', err);
      reply.code(500).send({ error: 'Failed to fetch admin stats' });
    }
  });

  // GET /admin/:marketplace/users
  fastify.get('/admin/:marketplace/users', async (request: any, reply) => {
    const { marketplace } = request.params;
    const isEvm = marketplace.toLowerCase().startsWith('0x');
    const divider = isEvm ? 1e18 : 1e9;
    
    try {
      const usersEventsQuery = `
        SELECT event_type, block_time, data->>'buyer' as buyer, data->>'seller' as seller, data->>'price' as price
        FROM marketplace_events
        WHERE data->>'marketplace' = $1 AND (event_type = 'NFTPurchased' OR event_type = 'NFTListed')
      `;
      const result = await pool.query(usersEventsQuery, [marketplace]);
      
      const userStats: Record<string, { joinDate: number; totalTrades: number; volume: number }> = {};
      
      for (const eventRow of result.rows) {
        const blockTime = parseInt(eventRow.block_time, 10);
        const price = parsePrice(eventRow.price);
        const buyer = eventRow.buyer;
        const seller = eventRow.seller;
        
        if (buyer && eventRow.event_type === 'NFTPurchased') {
          if (!userStats[buyer]) {
            userStats[buyer] = { joinDate: blockTime, totalTrades: 0, volume: 0 };
          }
          userStats[buyer].totalTrades += 1;
          userStats[buyer].volume += price;
          if (blockTime < userStats[buyer].joinDate) {
            userStats[buyer].joinDate = blockTime;
          }
        }
        
        if (seller) {
          if (!userStats[seller]) {
            userStats[seller] = { joinDate: blockTime, totalTrades: 0, volume: 0 };
          }
          if (eventRow.event_type === 'NFTPurchased') {
            userStats[seller].totalTrades += 1;
            userStats[seller].volume += price;
          }
          if (blockTime < userStats[seller].joinDate) {
            userStats[seller].joinDate = blockTime;
          }
        }
      }
      
      const users = Object.keys(userStats)
        .map(address => ({
          address,
          joinDate: userStats[address].joinDate * 1000,
          totalTrades: userStats[address].totalTrades,
          volume: userStats[address].volume / divider
        }))
        .sort((a, b) => b.volume - a.volume || b.totalTrades - a.totalTrades)
        .map((user, index) => ({
          id: (index + 1).toString(),
          address: user.address,
          joinDate: user.joinDate,
          totalTrades: user.totalTrades,
          volume: user.volume,
          status: 'active',
          reputation: Math.min(5.0, 4.0 + (user.totalTrades * 0.1))
        }));

      return users;
    } catch (err) {
      console.error('Error fetching admin users:', err);
      reply.code(500).send({ error: 'Failed to fetch admin users' });
    }
  });

  // GET /admin/:marketplace/listings
  fastify.get('/admin/:marketplace/listings', async (request: any, reply) => {
    const { marketplace } = request.params;
    const { status = 'all', search = '', limit = '50', offset = '0' } = request.query;
    const isEvm = marketplace.toLowerCase().startsWith('0x');
    const divider = isEvm ? 1e18 : 1e9;
    
    const limitVal = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetVal = Math.max(parseInt(offset, 10) || 0, 0);

    try {
      let queryText = `
        SELECT l.*, m.name as nft_name, m.symbol as nft_symbol, m.image_url, m.animation_url, m.description, m.attributes
        FROM listings l
        JOIN nft_metadata m ON l.nft_mint = m.mint
        WHERE l.marketplace_address = $1
      `;
      const queryParams: any[] = [marketplace];

      if (status !== 'all') {
        queryParams.push(status);
        queryText += ` AND l.status = $${queryParams.length}`;
      }

      if (search) {
        queryParams.push(`%${search}%`);
        queryText += ` AND (m.name ILIKE $${queryParams.length} OR m.description ILIKE $${queryParams.length} OR l.maker ILIKE $${queryParams.length})`;
      }

      queryText += ' ORDER BY l.updated_at DESC';

      queryParams.push(limitVal);
      queryText += ` LIMIT $${queryParams.length}`;

      queryParams.push(offsetVal);
      queryText += ` OFFSET $${queryParams.length}`;

      const result = await pool.query(queryText, queryParams);
      const listings = result.rows.map(row => ({
        address: row.address,
        marketplaceAddress: row.marketplace_address,
        maker: row.maker,
        nftMint: row.nft_mint,
        price: (parseFloat(row.price) / divider).toString(), // convert to proper decimal string
        metadataAddress: row.metadata_address,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        nft: {
          name: row.nft_name,
          symbol: row.nft_symbol,
          imageUrl: row.image_url,
          image: row.image_url,
          animationUrl: row.animation_url,
          animation_url: row.animation_url,
          description: row.description,
          attributes: row.attributes,
        }
      }));

      return listings;
    } catch (err) {
      console.error('Error fetching admin listings:', err);
      reply.code(500).send({ error: 'Failed to fetch admin listings' });
    }
  });

  // GET /admin/:marketplace/analytics
  fastify.get('/admin/:marketplace/analytics', async (request: any, reply) => {
    const { marketplace } = request.params;
    const isEvm = marketplace.toLowerCase().startsWith('0x');
    const divider = isEvm ? 1e18 : 1e9;
    
    try {
      const analyticsEventsQuery = `
        SELECT block_time, data->>'price' as price
        FROM marketplace_events
        WHERE data->>'marketplace' = $1 AND event_type = 'NFTPurchased'
      `;
      const result = await pool.query(analyticsEventsQuery, [marketplace]);
      
      const dailyData: Record<string, { salesCount: number; volume: number }> = {};
      
      for (const eventRow of result.rows) {
        const dateStr = new Date(parseInt(eventRow.block_time, 10) * 1000).toISOString().split('T')[0];
        const price = parsePrice(eventRow.price);
        
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { salesCount: 0, volume: 0 };
        }
        dailyData[dateStr].salesCount += 1;
        dailyData[dateStr].volume += price;
      }
      
      const analytics = Object.keys(dailyData)
        .sort()
        .map(date => ({
          date,
          salesCount: dailyData[date].salesCount,
          volume: dailyData[date].volume / divider
        }));

      return analytics;
    } catch (err) {
      console.error('Error fetching admin analytics:', err);
      reply.code(500).send({ error: 'Failed to fetch admin analytics' });
    }
  });

  // GET /admin/:marketplace/activity
  fastify.get('/admin/:marketplace/activity', async (request: any, reply) => {
    const { marketplace } = request.params;
    const { limit = '50', offset = '0' } = request.query;
    const isEvm = marketplace.toLowerCase().startsWith('0x');
    const divider = isEvm ? 1e18 : 1e9;
    const currency = isEvm ? 'ETH' : 'SOL';
    
    const limitVal = Math.min(parseInt(limit, 10) || 50, 200);
    const offsetVal = Math.max(parseInt(offset, 10) || 0, 0);

    try {
      const activityQuery = `
        SELECT id, event_type, tx_signature, block_time, data
        FROM marketplace_events
        WHERE data->>'marketplace' = $1
        ORDER BY block_time DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(activityQuery, [marketplace, limitVal, offsetVal]);
      const activities = result.rows.map(row => {
        const type = row.event_type === 'NFTListed' ? 'list' :
                     row.event_type === 'NFTPurchased' ? 'sale' :
                     row.event_type === 'NFTDelisted' ? 'delist' :
                     row.event_type === 'FeeUpdated' ? 'fee_update' :
                     row.event_type === 'InitializeMarketplace' ? 'initialize' : 'unknown';

        let details = '';
        let severity = 'info';
        let user = '';
        
        if (row.event_type === 'NFTListed') {
          details = `NFT listed for ${parsePrice(row.data.price) / divider} ${currency}`;
          user = row.data.seller;
          severity = 'info';
        } else if (row.event_type === 'NFTPurchased') {
          details = `NFT purchased for ${parsePrice(row.data.price) / divider} ${currency}`;
          user = row.data.buyer;
          severity = 'success';
        } else if (row.event_type === 'NFTDelisted') {
          details = `NFT delisted`;
          user = row.data.seller || 'Seller';
          severity = 'warning';
        } else if (row.event_type === 'FeeUpdated') {
          const newFee = row.data.new_fee !== undefined ? row.data.new_fee : row.data.newFee;
          details = `Updated marketplace fee to ${newFee !== undefined ? (newFee / 100).toFixed(2) + '%' : 'NaN%'}`;
          user = 'Admin';
          severity = 'info';
        } else if (row.event_type === 'InitializeMarketplace') {
          const fee = row.data.fee !== undefined ? row.data.fee : row.data.fee_bps;
          details = `Initialized marketplace "${row.data.name}" with fee ${fee !== undefined ? (fee / 100).toFixed(2) + '%' : 'NaN%'}`;
          user = 'Admin';
          severity = 'success';
        }

        return {
          id: row.id.toString(),
          type,
          user,
          details,
          timestamp: parseInt(row.block_time, 10) * 1000,
          severity
        };
      });

      return activities;
    } catch (err) {
      console.error('Error fetching admin activities:', err);
      reply.code(500).send({ error: 'Failed to fetch admin activities' });
    }
  });

  // POST /admin/:marketplace/rate-limit
  fastify.post('/admin/:marketplace/rate-limit', async (request: any, reply) => {
    const { marketplace } = request.params;
    const { rateLimit } = request.body;

    if (typeof rateLimit !== 'number' || rateLimit < 1) {
      return reply.code(400).send({ error: 'Invalid rate limit value. Must be a positive integer.' });
    }

    try {
      // 1. Update the database
      const updateQuery = `
        UPDATE marketplaces
        SET rate_limit = $1, updated_at = CURRENT_TIMESTAMP
        WHERE address = $2
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [rateLimit, marketplace]);

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'Marketplace not found' });
      }

      // 2. Invalidate Redis cache
      const cacheKey = `stats:${marketplace}`;
      try {
        await redis.del(cacheKey);
      } catch (cacheErr) {
        console.warn('Redis delete failed in rate-limit route:', cacheErr);
      }

      return { success: true, rateLimit: result.rows[0].rate_limit };
    } catch (err) {
      console.error('Error updating marketplace rate limit:', err);
      reply.code(500).send({ error: 'Failed to update rate limit' });
    }
  });
}

