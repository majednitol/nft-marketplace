import { FastifyInstance } from 'fastify';
import { pool } from '../db/client';
import { Blob } from 'buffer';
import { publishEvent } from '../nats';

async function uploadToPinata(base64Data: string, filename: string): Promise<string> {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    throw new Error('PINATA_JWT is not configured');
  }

  // Parse MIME type and extract base64 payload
  const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  const mimeType = matches ? matches[1] : 'application/octet-stream';
  const base64Payload = matches ? matches[2] : base64Data;
  const buffer = Buffer.from(base64Payload, 'base64');

  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType }) as any;
  formData.append('file', blob, filename);

  const pinataMetadata = JSON.stringify({ name: filename });
  formData.append('pinataMetadata', pinataMetadata);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pinataJwt}`
    },
    body: formData
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Pinata upload failed with status ${response.status}: ${errText}`);
  }

  const result: any = await response.json();
  return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
}

function normalizeMint(mint: string): string {
  if (typeof mint === 'string' && mint.toLowerCase().startsWith('0x')) {
    return mint.toLowerCase();
  }
  return mint;
}

export async function nftsRoutes(fastify: FastifyInstance) {
  // POST /nfts/metadata - Register NFT metadata
  fastify.post('/nfts/metadata', async (request: any, reply) => {
    const { 
      mint, 
      name, 
      symbol, 
      description, 
      imageUrl, 
      attributes, 
      imageData, 
      animationUrl, 
      animationData 
    } = request.body;

    if (!mint || !name) {
      reply.code(400).send({ error: 'Mint address and name are required' });
      return;
    }

    const normalizedMint = normalizeMint(mint);
    const host = request.headers.host || 'localhost:3001';
    const protocol = request.headers['x-forwarded-proto'] || 'http';
    const uri = `${protocol}://${host}/api/nfts/metadata/${normalizedMint}`;
    
    let dynamicImageUrl = imageUrl || '';
    let dynamicAnimationUrl = animationUrl || '';

    const pinataJwt = process.env.PINATA_JWT;
    if (pinataJwt && pinataJwt !== 'your_pinata_jwt_token_here') {
      try {
        console.log(`🌐 [EVM IPFS] PINATA_JWT detected. Uploading assets to IPFS...`);
        if (imageData && imageData.startsWith('data:')) {
          console.log(`🌐 [EVM IPFS] Uploading artwork image to Pinata IPFS...`);
          dynamicImageUrl = await uploadToPinata(imageData, `${normalizedMint}-image`);
          console.log(`✅ [EVM IPFS] Artwork image uploaded: ${dynamicImageUrl}`);
        }
        if (animationData && animationData.startsWith('data:')) {
          console.log(`🌐 [EVM IPFS] Uploading animation media to Pinata IPFS...`);
          dynamicAnimationUrl = await uploadToPinata(animationData, `${normalizedMint}-media`);
          console.log(`✅ [EVM IPFS] Animation media uploaded: ${dynamicAnimationUrl}`);
        }
      } catch (ipfsErr: any) {
        console.error(`❌ [EVM IPFS] Pinata upload failed. Falling back to local storage:`, ipfsErr.message);
        dynamicImageUrl = imageData ? `${protocol}://${host}/api/nfts/image/${normalizedMint}` : (imageUrl || '');
        dynamicAnimationUrl = animationData ? `${protocol}://${host}/api/nfts/animation/${normalizedMint}` : (animationUrl || '');
      }
    } else {
      dynamicImageUrl = imageData ? `${protocol}://${host}/api/nfts/image/${normalizedMint}` : (imageUrl || '');
      dynamicAnimationUrl = animationData ? `${protocol}://${host}/api/nfts/animation/${normalizedMint}` : (animationUrl || '');
    }

    const chain = normalizedMint.toLowerCase().startsWith('0x') ? 'evm' : 'solana';
    const queryText = `
      INSERT INTO nft_metadata (mint, name, symbol, uri, image_url, description, attributes, image_data, chain, animation_url, animation_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (mint) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        symbol = EXCLUDED.symbol,
        uri = EXCLUDED.uri,
        image_url = EXCLUDED.image_url,
        description = EXCLUDED.description,
        attributes = EXCLUDED.attributes,
        image_data = EXCLUDED.image_data,
        chain = EXCLUDED.chain,
        animation_url = EXCLUDED.animation_url,
        animation_data = EXCLUDED.animation_data
      RETURNING *
    `;

    try {
      const attributesJson = JSON.stringify(attributes || []);
      const result = await pool.query(queryText, [
        normalizedMint,
        name,
        symbol || '',
        uri,
        dynamicImageUrl,
        description || '',
        attributesJson,
        imageData || null,
        chain,
        dynamicAnimationUrl || null,
        animationData || null
      ]);

      console.log(`✅ Registered metadata and image in DB for mint: ${normalizedMint}`);
      
      // Publish metadata registration to NATS
      await publishEvent('marketplace.metadata', {
        event: 'registered',
        chain,
        mint: normalizedMint,
        data: result.rows[0]
      }).catch(err => {
        console.error('Failed to publish metadata registration event to NATS:', err.message);
      });

      return {
        success: true,
        uri,
        metadata: result.rows[0]
      };
    } catch (dbErr) {
      console.error('Database insertion error in POST /nfts/metadata:', dbErr);
      reply.code(500).send({ error: 'Failed to save metadata to database' });
    }
  });

  // GET /nfts/metadata/:mint - Serve standard Metaplex JSON metadata
  fastify.get('/nfts/metadata/:mint', async (request: any, reply) => {
    const { mint } = request.params;
    const normalizedMint = normalizeMint(mint);

    const queryText = `
      SELECT name, symbol, description, image_url, attributes, animation_url
      FROM nft_metadata
      WHERE mint = $1
      LIMIT 1
    `;

    try {
      const result = await pool.query(queryText, [normalizedMint]);
      if (result.rows.length === 0) {
        reply.code(404).send({ error: 'Metadata not found' });
        return;
      }

      const row = result.rows[0];
      
      // Construct Metaplex-compliant JSON response
      const metadataJson = {
        name: row.name,
        symbol: row.symbol,
        description: row.description,
        image: row.image_url,
        animation_url: row.animation_url,
        attributes: typeof row.attributes === 'string' 
          ? JSON.parse(row.attributes) 
          : (row.attributes || []),
      };

      reply.header('Content-Type', 'application/json');
      return metadataJson;
    } catch (dbErr) {
      console.error(`Database query error in GET /nfts/metadata/${mint}:`, dbErr);
      reply.code(500).send({ error: 'Database query failed' });
    }
  });

  // GET /nfts/image/:mint - Serve stored binary image
  fastify.get('/nfts/image/:mint', async (request: any, reply) => {
    const { mint } = request.params;
    const normalizedMint = normalizeMint(mint);

    const queryText = `
      SELECT image_data
      FROM nft_metadata
      WHERE mint = $1
      LIMIT 1
    `;

    try {
      const result = await pool.query(queryText, [normalizedMint]);
      if (result.rows.length === 0 || !result.rows[0].image_data) {
        reply.code(404).send({ error: 'Image not found for given mint' });
        return;
      }

      const imageDataUri = result.rows[0].image_data;
      
      // Format: data:image/png;base64,iVBORw0KGgoAAAANSU...
      const matches = imageDataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches) {
        // Fallback: if not standard Data URI, check if raw base64
        const buffer = Buffer.from(imageDataUri, 'base64');
        reply.header('Content-Type', 'image/png');
        reply.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        return reply.send(buffer);
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      reply.header('Content-Type', mimeType);
      reply.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      return reply.send(buffer);
    } catch (error) {
      console.error(`Error serving binary image for mint ${mint}:`, error);
      reply.code(500).send({ error: 'Failed to retrieve image' });
    }
  });

  // GET /nfts/animation/:mint - Serve stored binary audio/video
  fastify.get('/nfts/animation/:mint', async (request: any, reply) => {
    const { mint } = request.params;
    const normalizedMint = normalizeMint(mint);

    const queryText = `
      SELECT animation_data
      FROM nft_metadata
      WHERE mint = $1
      LIMIT 1
    `;

    try {
      const result = await pool.query(queryText, [normalizedMint]);
      if (result.rows.length === 0 || !result.rows[0].animation_data) {
        reply.code(404).send({ error: 'Animation media not found for given mint' });
        return;
      }

      const animationDataUri = result.rows[0].animation_data;
      
      // Format: data:video/mp4;base64,iVBORw0KGgoAAAANSU...
      const matches = animationDataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches) {
        // Fallback: assume MP4 if no Data URI structure
        const buffer = Buffer.from(animationDataUri, 'base64');
        reply.header('Content-Type', 'video/mp4');
        reply.header('Cache-Control', 'public, max-age=31536000');
        return reply.send(buffer);
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      reply.header('Content-Type', mimeType);
      reply.header('Cache-Control', 'public, max-age=31536000');
      return reply.send(buffer);
    } catch (error) {
      console.error(`Error serving binary animation for mint ${mint}:`, error);
      reply.code(500).send({ error: 'Failed to retrieve animation' });
    }
  });
}
