-- CREATE TABLE FOR MARKETPLACES
CREATE TABLE IF NOT EXISTS marketplaces (
    address VARCHAR(44) PRIMARY KEY,
    name VARCHAR(32) NOT NULL,
    fee_bps INT NOT NULL,
    authority VARCHAR(44) NOT NULL,
    treasury VARCHAR(44) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE TABLE FOR NFT METADATA (CACHED)
CREATE TABLE IF NOT EXISTS nft_metadata (
    mint VARCHAR(44) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    symbol VARCHAR(32),
    uri TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE TABLE FOR LISTINGS
CREATE TABLE IF NOT EXISTS listings (
    address VARCHAR(44) PRIMARY KEY, -- listing PDA
    marketplace_address VARCHAR(44) NOT NULL REFERENCES marketplaces(address) ON DELETE CASCADE,
    maker VARCHAR(44) NOT NULL,
    nft_mint VARCHAR(44) NOT NULL REFERENCES nft_metadata(mint) ON DELETE CASCADE,
    price NUMERIC NOT NULL, -- in lamports
    metadata_address VARCHAR(44) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'sold', 'delisted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE TABLE FOR EVENTS
CREATE TABLE IF NOT EXISTS marketplace_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'listed', 'purchased', 'delisted', 'fee_updated'
    tx_signature VARCHAR(88) NOT NULL,
    block_time BIGINT NOT NULL,
    slot BIGINT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_listings_marketplace_status ON listings(marketplace_address, status);
CREATE INDEX IF NOT EXISTS idx_listings_nft_mint ON listings(nft_mint);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_events_tx_signature ON marketplace_events(tx_signature);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON marketplace_events(created_at DESC);

-- MIGRATIONS
ALTER TABLE nft_metadata ADD COLUMN IF NOT EXISTS image_data TEXT;
ALTER TABLE marketplaces ADD COLUMN IF NOT EXISTS rate_limit INT NOT NULL DEFAULT 100;

-- MULTICHAIN MIGRATIONS
ALTER TABLE marketplaces ALTER COLUMN address TYPE VARCHAR(100);
ALTER TABLE marketplaces ALTER COLUMN authority TYPE VARCHAR(100);
ALTER TABLE marketplaces ALTER COLUMN treasury TYPE VARCHAR(100);
ALTER TABLE marketplaces ADD COLUMN IF NOT EXISTS chain VARCHAR(20) DEFAULT 'solana';

ALTER TABLE nft_metadata ALTER COLUMN mint TYPE VARCHAR(100);
ALTER TABLE nft_metadata ADD COLUMN IF NOT EXISTS chain VARCHAR(20) DEFAULT 'solana';

ALTER TABLE listings ALTER COLUMN address TYPE VARCHAR(100);
ALTER TABLE listings ALTER COLUMN marketplace_address TYPE VARCHAR(100);
ALTER TABLE listings ALTER COLUMN maker TYPE VARCHAR(100);
ALTER TABLE listings ALTER COLUMN nft_mint TYPE VARCHAR(100);
ALTER TABLE listings ALTER COLUMN metadata_address TYPE VARCHAR(100);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS chain VARCHAR(20) DEFAULT 'solana';

-- MEDIA NFT MIGRATIONS
ALTER TABLE nft_metadata ADD COLUMN IF NOT EXISTS animation_url TEXT;
ALTER TABLE nft_metadata ADD COLUMN IF NOT EXISTS animation_data TEXT;



