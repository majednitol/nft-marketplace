import React from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign, Star } from 'lucide-react';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { StatsCard } from './StatsCard';
import { NFTCard } from '../nft/NFTCard';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface DashboardProps {
  onViewChange?: (view: string) => void;
}

export function Dashboard({ onViewChange }: DashboardProps = {}) {
  const { stats, listings, loading, purchaseNFT, activeChain } = useMarketplace();

  const currency = activeChain === 'evm' ? 'ETH' : 'SOL';
  const chainName = activeChain === 'evm' ? 'Ethereum Sepolia' : 'Solana';

  const collections = React.useMemo(() => {
    const groups: { [key: string]: typeof listings } = {};
    
    listings.forEach(listing => {
      let collectionName = 'General Collection';
      if (listing.metadata?.collection?.name) {
        collectionName = listing.metadata.collection.name;
      } else if (listing.metadata?.name) {
        // Strip trailing number/hash identifiers to group common names
        const cleanName = listing.metadata.name.replace(/#\s*\d+.*$/, '').trim();
        if (cleanName) {
          collectionName = cleanName;
        }
      }
      
      if (!groups[collectionName]) {
        groups[collectionName] = [];
      }
      groups[collectionName].push(listing);
    });

    return Object.entries(groups).map(([name, items]) => {
      const prices = items.map(i => i.price);
      const floorPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const volume = prices.reduce((sum, p) => sum + p, 0);
      
      let artist = 'Various Creators';
      const firstMetadata = items[0]?.metadata;
      if (firstMetadata?.creators && firstMetadata.creators.length > 0) {
        const creator = firstMetadata.creators[0].address;
        artist = `${creator.slice(0, 4)}...${creator.slice(-4)}`;
      } else if (items[0]?.seller) {
        const seller = items[0].seller;
        artist = `${seller.slice(0, 4)}...${seller.slice(-4)}`;
      }

      return {
        name,
        artist,
        floorPrice,
        volume,
        itemsCount: items.length
      };
    }).sort((a, b) => b.itemsCount - a.itemsCount);
  }, [listings]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const featuredNFTs = listings.slice(0, 8);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary-600 via-primary-700 to-accent-purple rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-pink/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-slide-up">
            Discover, Collect, and Trade <span className="text-gradient">NFTs</span>
          </h1>
          <p className="text-gray-200 text-lg mb-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
            The premier {chainName} marketplace for digital collectibles. 
            Explore unique artworks and join a vibrant community of creators and collectors.
          </p>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
            <button 
              className="btn-primary px-6 py-3"
              onClick={() => onViewChange?.('explore')}
            >
              Explore NFTs
            </button>
            <button 
              className="btn-secondary border-2 border-white/30 hover:border-white/50 px-6 py-3"
              onClick={() => onViewChange?.('portfolio')}
            >
              View Portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Volume"
            value={`${stats.totalVolume.toLocaleString()} ${currency}`}
            change="+12.5% from last week"
            changeType="positive"
            icon={DollarSign}
          />
          <StatsCard
            title="Total Listings"
            value={stats.totalListings.toLocaleString()}
            change="+5.2% from last week"
            changeType="positive"
            icon={ShoppingBag}
          />
          <StatsCard
            title="Unique Owners"
            value={stats.uniqueOwners.toLocaleString()}
            change="+8.1% from last week"
            changeType="positive"
            icon={Users}
          />
          <StatsCard
            title="Floor Price"
            value={`${stats.floorPrice} ${currency}`}
            change="-2.3% from last week"
            changeType="negative"
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Featured Collections */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Featured NFTs</h2>
          <button 
            className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium transition-colors"
            onClick={() => onViewChange?.('explore')}
          >
            View All →
          </button>
        </div>

        {featuredNFTs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {featuredNFTs.map((nft) => (
              <NFTCard
                key={nft.id}
                nft={nft}
                onBuy={(nft) => purchaseNFT(nft.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white/5 dark:bg-dark-300/10 rounded-3xl border border-primary-800/10 text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-purple rounded-2xl flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">No active listings</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                There are no NFTs listed for sale right now. Go to your portfolio to list an NFT.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Trending Collections */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trending Collections</h2>
          <button 
            className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium transition-colors"
            onClick={() => onViewChange?.('trending')}
          >
            View All →
          </button>
        </div>

        {collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {collections.slice(0, 3).map((collection) => (
              <div key={collection.name} className="card card-hover p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-purple rounded-2xl flex items-center justify-center">
                    <Star className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[180px]" title={collection.name}>
                      {collection.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">by {collection.artist}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-xs">Floor</p>
                    <p className="text-base font-semibold text-primary-600 dark:text-primary-400 truncate">
                      {collection.floorPrice.toFixed(2)} {currency}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-xs">Volume</p>
                    <p className="text-base font-semibold text-primary-600 dark:text-primary-400 truncate">
                      {collection.volume.toFixed(1)} {currency}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-xs">Items</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {collection.itemsCount}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white/5 dark:bg-dark-300/10 rounded-3xl border border-primary-800/10 text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-purple rounded-2xl flex items-center justify-center">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">No active collections</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                There are currently no active collections listed on the marketplace.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}