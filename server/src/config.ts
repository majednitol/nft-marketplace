import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or server folder
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/nft_marketplace',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  programId: process.env.VITE_PROGRAM_ID || '7jkmajwshoW56VwjHGwPGbTaSNH25z186VBraqQTEGWN',
  evmRpcUrl: process.env.EVM_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/BFjTtbanxS5n2OC708mYTHPpIsk4zzot',
  evmMarketplaceAddress: process.env.EVM_MARKETPLACE_ADDRESS || '0xc7e4BA277052c626a94CC6AB12Ae46c569B1DeCf',
  evmNftAddress: process.env.EVM_NFT_ADDRESS || '0xEbed9d5BAE29ddc5C7572a57fCE01a2e85e71439',
};
