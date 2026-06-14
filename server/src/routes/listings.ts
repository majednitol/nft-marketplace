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

function getDecimalsDivider(mint: string): number {
  return mint && mint.toLowerCase().startsWith('0x') ? 1e18 : 1e9;
}

function normalizeAddress(addr: string): string {
  if (typeof addr === 'string' && addr.toLowerCase().startsWith('0x')) {
    return addr.toLowerCase();
  }
  return addr;
}

export async function listingsRoutes(fastify: FastifyInstance) {
  // GET /listings
  fastify.get('/listings', async (request: any, reply) => {
    const {
      marketplace,
      status = 'active',
      sort = 'created_desc',
      search = '',
      limit = '20',
      offset = '0',
      chain = '',
    } = request.query;

    const limitVal = Math.min(parseInt(limit, 10) || 20, 100);
    const offsetVal = Math.max(parseInt(offset, 10) || 0, 0);
    const normalizedMarketplace = marketplace ? normalizeAddress(marketplace) : '';

    // Build redis cache key
    const cacheKey = `listings:query:${normalizedMarketplace || 'all'}:${status}:${sort}:${limitVal}:${offsetVal}:${search}:${chain || 'all'}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        reply.header('X-Cache', 'HIT');
        return JSON.parse(cached);
      }
    } catch (cacheErr) {
      console.warn('Redis read failed in listings route:', cacheErr);
    }

    // Build SQL query
    let queryText = `
      SELECT l.*, m.name as nft_name, m.symbol as nft_symbol, m.image_url, m.animation_url, m.description, m.attributes
      FROM listings l
      JOIN nft_metadata m ON l.nft_mint = m.mint
    `;

    const queryParams: any[] = [];
    const whereConditions: string[] = [];

    // Filter by status
    queryParams.push(status);
    whereConditions.push(`l.status = $${queryParams.length}`);

    // Filter by marketplace
    if (normalizedMarketplace) {
      queryParams.push(normalizedMarketplace);
      whereConditions.push(`l.marketplace_address = $${queryParams.length}`);
    }

    // Filter by search term
    if (search) {
      queryParams.push(`%${search}%`);
      whereConditions.push(`(m.name ILIKE $${queryParams.length} OR m.description ILIKE $${queryParams.length})`);
    }

    // Filter by chain
    if (chain) {
      queryParams.push(chain);
      whereConditions.push(`l.chain = $${queryParams.length}`);
    }

    if (whereConditions.length > 0) {
      queryText += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Apply sorting
    if (sort === 'price_asc') {
      queryText += ' ORDER BY l.price ASC';
    } else if (sort === 'price_desc') {
      queryText += ' ORDER BY l.price DESC';
    } else if (sort === 'created_asc') {
      queryText += ' ORDER BY l.created_at ASC';
    } else {
      queryText += ' ORDER BY l.created_at DESC';
    }

    // Apply pagination
    queryParams.push(limitVal);
    queryText += ` LIMIT $${queryParams.length}`;

    queryParams.push(offsetVal);
    queryText += ` OFFSET $${queryParams.length}`;

    try {
      const result = await pool.query(queryText, queryParams);
      const listings = result.rows.map(row => ({
        address: row.address,
        marketplaceAddress: row.marketplace_address,
        maker: row.maker,
        nftMint: row.nft_mint,
        price: row.price.toString(),
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

      // Cache response for 1 hour or until invalidated by indexer
      try {
        await redis.setex(cacheKey, 3600, JSON.stringify(listings));
      } catch (cacheErr) {
        console.warn('Redis write failed in listings route:', cacheErr);
      }

      reply.header('X-Cache', 'MISS');
      return listings;
    } catch (dbErr) {
      console.error('Database query error in GET /listings:', dbErr);
      reply.code(500).send({ error: 'Database query failed' });
    }
  });

  // GET /listings/:mint
  fastify.get('/listings/:mint', async (request: any, reply) => {
    const { mint } = request.params;
    const normalizedMint = normalizeAddress(mint);
    const cacheKey = `listing:mint:${normalizedMint}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        reply.header('X-Cache', 'HIT');
        return JSON.parse(cached);
      }
    } catch (cacheErr) {
      console.warn('Redis read failed in listing details route:', cacheErr);
    }

    const queryText = `
      SELECT l.*, m.name as nft_name, m.symbol as nft_symbol, m.image_url, m.animation_url, m.description, m.attributes
      FROM listings l
      JOIN nft_metadata m ON l.nft_mint = m.mint
      WHERE l.nft_mint = $1 AND l.status = 'active'
      LIMIT 1
    `;

    try {
      const result = await pool.query(queryText, [normalizedMint]);
      if (result.rows.length === 0) {
        reply.code(404).send({ error: 'Active listing not found for mint' });
        return;
      }

      const row = result.rows[0];
      const listing = {
        address: row.address,
        marketplaceAddress: row.marketplace_address,
        maker: row.maker,
        nftMint: row.nft_mint,
        price: row.price.toString(),
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
      };

      try {
        await redis.setex(cacheKey, 3600, JSON.stringify(listing));
      } catch (cacheErr) {
        console.warn('Redis write failed in listing details route:', cacheErr);
      }

      reply.header('X-Cache', 'MISS');
      return listing;
    } catch (dbErr) {
      console.error(`Database query error in GET /listings/${mint}:`, dbErr);
      reply.code(500).send({ error: 'Database query failed' });
    }
  });

  // GET /users/:wallet/purchases
  fastify.get('/users/:wallet/purchases', async (request: any, reply) => {
    const { wallet } = request.params;
    const normalizedWallet = normalizeAddress(wallet);
    
    try {
      // Find all NFTPurchased events where the buyer is our wallet
      const query = `
        SELECT e.*, m.name as nft_name, m.symbol as nft_symbol, m.image_url, m.animation_url, m.description, m.attributes,
               (SELECT price FROM listings WHERE nft_mint = e.data->>'nft_mint' AND status = 'active' LIMIT 1) as current_price
        FROM marketplace_events e
        LEFT JOIN nft_metadata m ON e.data->>'nft_mint' = m.mint
        WHERE e.event_type = 'NFTPurchased' AND e.data->>'buyer' = $1
        ORDER BY e.block_time DESC
      `;
      const result = await pool.query(query, [normalizedWallet]);
      
      const purchases = result.rows.map(row => {
        const eventData = row.data;
        const mint = eventData.nft_mint || '';
        const divider = getDecimalsDivider(mint);
        const purchasePrice = parsePrice(eventData.price) / divider;
        const currentPrice = row.current_price ? parsePrice(row.current_price) / divider : purchasePrice;
        
        return {
          id: row.id.toString(),
          purchasePrice,
          currentValue: currentPrice,
          purchaseDate: parseInt(row.block_time, 10) * 1000,
          seller: eventData.seller,
          transactionHash: row.tx_signature,
          nft: {
            id: `purchase-nft-${row.id}`,
            marketplace: eventData.marketplace,
            seller: eventData.seller,
            nftMint: eventData.nft_mint,
            price: currentPrice,
            createdAt: parseInt(row.block_time, 10) * 1000,
            metadata: {
              name: row.nft_name || `NFT ${eventData.nft_mint.slice(0, 8)}`,
              description: row.description || 'NFT details',
              image: row.image_url || '',
              animationUrl: row.animation_url,
              animation_url: row.animation_url,
              attributes: row.attributes || []
            }
          }
        };
      });
      
      return purchases;
    } catch (err) {
      console.error('Error fetching purchases for user:', err);
      reply.code(500).send({ error: 'Failed to fetch purchase history' });
    }
  });

  // GET /listings/:mint/history
  fastify.get('/listings/:mint/history', async (request: any, reply) => {
    const { mint } = request.params;
    const normalizedMint = normalizeAddress(mint);
    
    try {
      const query = `
        SELECT event_type, tx_signature, block_time, data
        FROM marketplace_events
        WHERE data->>'nft_mint' = $1
        ORDER BY block_time DESC
      `;
      const result = await pool.query(query, [normalizedMint]);
      
      const history = result.rows.map(row => {
        const type = row.event_type === 'NFTListed' ? 'list' :
                     row.event_type === 'NFTPurchased' ? 'sale' :
                     row.event_type === 'NFTDelisted' ? 'delist' :
                     row.event_type === 'FeeUpdated' ? 'fee_update' :
                     row.event_type === 'InitializeMarketplace' ? 'initialize' : 'unknown';
        
        const divider = getDecimalsDivider(normalizedMint);
                     
        return {
          type,
          price: row.data.price ? parsePrice(row.data.price) / divider : undefined,
          from: row.data.seller || row.data.maker || '',
          to: row.data.buyer || '',
          date: new Date(parseInt(row.block_time, 10) * 1000).toISOString().split('T')[0],
          txHash: row.tx_signature
        };
      });

      return history;
    } catch (err) {
      console.error(`Error fetching history for mint ${mint}:`, err);
      reply.code(500).send({ error: 'Failed to fetch NFT transaction history' });
    }
  });
}
