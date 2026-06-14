# NFT Nexus: Multi-Chain Real-Time NFT Marketplace

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-purple.svg?style=for-the-badge&logo=solana)](https://explorer.solana.com/address/7jkmajwshoW56VwjHGwPGbTaSNH25z186VBraqQTEGWN?cluster=devnet)
[![EVM Sepolia](https://img.shields.io/badge/EVM-Sepolia-blue.svg?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io/address/0xc7e4BA277052c626a94CC6AB12Ae46c569B1DeCf)
[![NATS JetStream](https://img.shields.io/badge/RealTime-NATS-red.svg?style=for-the-badge&logo=nats-dot-io)](https://nats.io)
[![Vite](https://img.shields.io/badge/Vite-5.4-yellow.svg?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-black.svg?style=for-the-badge&logo=fastify)](https://fastify.io)

A production-grade, decentralized NFT marketplace supporting both **Solana** and **EVM (Ethereum Sepolia)** networks. Featuring high-performance block indexers, decentralized storage via **Pinata IPFS**, real-time event synchronization powered by a **NATS JetStream** message broker, custom interactive audio/video players, and a highly polished dark-purple glassmorphism UI built for accessibility and performance.

---

##  Interactive Media & UX Features

*   **Audio & Video NFT Support**:
    *   **Rotating Vinyl Visualizer**: Custom-designed album art animations that rotate dynamically when playing music tracks.
    *   **Animated Waveform Visualizer**: Sound waves that react smoothly using pure CSS keyframes, matching the glassmorphic aesthetics.
    *   **Fully-Featured Media Player**: Track timeline scrubbing, duration/elapsed time tracking, volume adjustments, mute toggling, and play/pause controls.
    *   **Fallback Dynamic Streams**: Dynamic streaming endpoints serving base64 media data with accurate MIME headers in case of external network lag.
*   **Accessibility-First (WCAG AA Compliance)**:
    *   Full screen-reader compatibility (NVDA, JAWS, VoiceOver) utilizing explicit ARIA roles and landmarks.
    *   Keyboard navigation with custom focus traps for modals and outline highlights.
    *   Skip navigation links and aria-live announcements for real-time indexing changes.
*   **Global Keyboard Shortcuts**:
    *   `Alt + 1-4`: Navigate pages (Dashboard, Explore, Portfolio, Favorites).
    *   `Ctrl + K`: Focus global search input.
    *   `Ctrl + Shift + F`: Toggle advanced filters.
    *   `Ctrl + N`: Open the NFT listing panel.
    *   `Ctrl + Shift + P`: Toggle developer performance dashboard.
    *   `?`: Open the shortcuts overlay panel.

---

##  System Architecture

The application is split into a **Vite + React frontend client** and a **Fastify backend server**. Database integrity is managed by PostgreSQL via Prisma ORM, caching is handled by Redis, and real-time pub/sub synchronization is mediated via NATS JetStream.

```mermaid
graph TD
    subgraph Frontend [Vite React Client]
        UI[Marketplace UI]
        SolAdapter[Solana Wallet Adapter]
        Ethers[Ethers.js Provider]
        WS[WebSocket Client]
    end

    subgraph Backend [Fastify API Server]
        Fastify[Fastify Web Server]
        IndexerSol[Solana Indexer]
        IndexerEVM[EVM Indexer]
        WSGateway[WebSocket Gateway]
        NatsClient[NATS Publisher/Subscriber]
    end

    subgraph Database & Messaging
        Postgres[(PostgreSQL DB)]
        Redis[(Redis Cache)]
        NatsJS[[NATS JetStream]]
    end

    subgraph Blockchains
        SolanaDev[Solana Devnet]
        EVMTest[EVM Sepolia Testnet]
    end

    subgraph IPFS Storage
        Pinata[Pinata IPFS Gateway]
    end

    %% Connections
    UI --> SolAdapter
    UI --> Ethers
    SolAdapter --> SolanaDev
    Ethers --> EVMTest
    WS --> WSGateway

    WSGateway --> NatsClient
    NatsClient <--> NatsJS
    IndexerSol --> SolanaDev
    IndexerEVM --> EVMTest

    IndexerSol --> Postgres
    IndexerEVM --> Postgres
    Fastify --> Postgres
    Fastify --> Redis
    Fastify --> Pinata

    IndexerSol -.-> NatsClient
    IndexerEVM -.-> NatsClient
```

---

## 📁 Project Structure

```
NFT-Marketplace/
├── anchor/                  # Solana Anchor Program (Rust)
│   ├── programs/            # Marketplace smart contract instructions
│   └── Anchor.toml          # Anchor configuration
├── evm/                     # EVM Foundry Project (Solidity)
│   ├── src/                 # Marketplace & ERC721 contracts
│   └── foundry.toml         # Foundry testing/deployment environment
├── server/                  # Fastify Backend Server (TypeScript)
│   ├── src/
│   │   ├── indexer/         # Block indexers (Solana + EVM Sepolia polling)
│   │   ├── routes/          # REST endpoints (Nfts, listings, stats, admin)
│   │   ├── nats.ts          # NATS JetStream connection & stream setups
│   │   └── index.ts         # Fastify initialization & WebSocket Gateway
│   └── prisma/              # Postgres Database schema & migrations
├── src/                     # Vite Frontend client (React + TypeScript)
│   ├── components/          # Domain components (NFT card, players, layouts)
│   ├── contexts/            # State contexts (Marketplace, Wallet, Favorites)
│   ├── hooks/               # Custom hooks (useSolanaProgram, useEVMProgram)
│   └── styles/              # Design system styling tokens (Tailwind CSS)
├── docker-compose.yml       # Local infrastructure (Postgres, Redis, NATS)
└── package.json             # Root monorepo workspace configurations
```

---

##  Environment Configuration

### Root Frontend Environment (`.env.development`)
```env
# Solana Configuration - Devnet
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=7jkmajwshoW56VwjHGwPGbTaSNH25z186VBraqQTEGWN
VITE_MARKETPLACE_NAME="NFT-Nexus-Dev"

# EVM Configuration - Sepolia
VITE_EVM_NETWORK=sepolia
VITE_EVM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-alchemy-key
VITE_EVM_MARKETPLACE_ADDRESS=0xc7e4BA277052c626a94CC6AB12Ae46c569B1DeCf
VITE_EVM_NFT_ADDRESS=0xEbed9d5BAE29ddc5C7572a57fCE01a2e85e71439

# API and Gateways
VITE_API_URL=http://localhost:3001/api
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs
```

### Backend Environment (`server/.env`)
```env
# Backend server setup
PORT=3001
NODE_ENV=development

# Databases & Caching
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nft_marketplace?schema=public"
REDIS_URL="redis://localhost:6379"
NATS_URL="nats://localhost:4222"

# Blockchains
SOLANA_RPC_URL="https://api.devnet.solana.com"
EVM_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/your-alchemy-key"
EVM_MARKETPLACE_ADDRESS="0xc7e4BA277052c626a94CC6AB12Ae46c569B1DeCf"

# Pinata IPFS integration
PINATA_JWT="your-pinata-jwt-token"
```

---

##  Quick Start (Local Setup)

### 1. Launch Infrastructures (Docker)
Start PostgreSQL, Redis, and NATS JetStream locally:
```bash
docker-compose up -d
```

### 2. Configure Backend Server
Install backend dependencies and run database migrations:
```bash
cd server
npm install
npx prisma migrate dev
npm run dev
```
The backend server runs at `http://localhost:3001` and starts parsing blocks automatically.

### 3. Configure Frontend Client
From the project root folder:
```bash
npm install
npm run dev
```
The client dashboard opens at `http://localhost:3000`.

---

## 📡 Messaging & WebSocket Spec

The WebSocket Gateway serves as a real-time event router, forwarding blockchain state updates directly from NATS JetStream to client interfaces.

### WebSocket Connection
*   **Endpoint**: `ws://localhost:3001/api/ws`
*   **Flow**: Connection is initiated by `MarketplaceContext.tsx`. On connect, it automatically streams events based on the NATS `marketplace.>` subject space.

### Event Models

#### NFT Listed Event
```json
{
  "event": "listed",
  "data": {
    "mint": "0xebed9d5bae29ddc5c7572a57fce01a2e85e71439-12",
    "seller": "0xabc...",
    "price": "0.15",
    "chain": "evm",
    "timestamp": 1781240064734
  }
}
```

#### NFT Purchased Event
```json
{
  "event": "purchased",
  "data": {
    "mint": "0xebed9d5bae29ddc5c7572a57fce01a2e85e71439-12",
    "buyer": "0xdef...",
    "price": "0.15",
    "chain": "evm",
    "timestamp": 1781240089021
  }
}
```

---

## 🛠 Troubleshooting & Verification Playbook

### Indexer Acceleration Check
The EVM indexer maintains block state and features an active lookback buffer:
*   **State Log Inspection**: View recent logs to confirm the block crawler is catching events:
    ```bash
    tail -n 50 ~/.gemini/antigravity/brain/86809017-a68a-4fa4-8708-f82acfbbdeca/.system_generated/tasks/task-6224.log
    ```
*   **Duplicate Prevention**: On restart, the indexer queries database signatures (`tx_signature`) to prevent duplicate listings or invalid database states.

### NATS Event Diagnostic
If real-time updates fail to broadcast, verify the local NATS daemon:
```bash
# Check Docker status
docker ps | grep nats

# Inspect NATS connection logs
docker logs nats-test
```

### Redis Cache Refresh
If listing listings does not refresh:
*   Invalidate caches manually:
    ```bash
    redis-cli flushall
    ```

### Strict Type Validation
Before deploying to production, run type checking:
```bash
npm run type-check
```

---

## 🤝 Contributing
Please see our [CONTRIBUTING](CONTRIBUTING.md) rules and submit Pull Requests matching the conventional commit guidelines. 

*Built with ❤️ on Solana and EVM blockchains.*
