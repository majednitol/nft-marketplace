#!/bin/bash

# NFT Marketplace Deployment Script
echo "🚀 Deploying NFT Marketplace to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the project
echo "📦 Building project..."
npm run build:production

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Your NFT Marketplace is now live on Vercel!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the deployment URL from above"
echo "2. Go to https://github.com/Blessedbiello/NFT-Marketplace"
echo "3. Click the gear icon next to 'About'"
echo "4. Add the Vercel URL to the 'Website' field"
echo "5. Add relevant topics: solana, nft, marketplace, react, typescript, web3"