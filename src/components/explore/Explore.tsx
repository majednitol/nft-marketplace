import React, { useState, useMemo } from 'react';
import { Filter, Grid, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { NFTCard } from '../nft/NFTCard';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ExploreProps {
  onViewChange?: (view: string) => void;
}

export function Explore({ onViewChange }: ExploreProps = {}) {
  const { listings, loading, purchaseNFT, stats, activeChain } = useMarketplace();
  const currency = activeChain === 'evm' ? 'ETH' : 'SOL';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [filterPrice, setFilterPrice] = useState({ min: '', max: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Get unique rarities and collections for filters
  const uniqueRarities = useMemo(() => {
    const rarities = new Set<string>();
    listings.forEach(nft => {
      const rarity = nft.metadata.attributes?.find(attr => attr.trait_type === 'Rarity')?.value;
      if (rarity) rarities.add(String(rarity));
    });
    return Array.from(rarities);
  }, [listings]);

  const uniqueCollections = useMemo(() => {
    const collections = new Set<string>();
    listings.forEach(nft => {
      if (nft.metadata.collection?.name) {
        collections.add(nft.metadata.collection.name);
      }
    });
    return Array.from(collections);
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings.filter(nft => {
      const matchesSearch = nft.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (nft.metadata.collection?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPrice = (!filterPrice.min || nft.price >= parseFloat(filterPrice.min)) &&
                          (!filterPrice.max || nft.price <= parseFloat(filterPrice.max));
      
      const matchesRarity = !selectedRarity || 
                           nft.metadata.attributes?.find(attr => attr.trait_type === 'Rarity')?.value === selectedRarity;
      
      const matchesCollection = !selectedCollection || 
                               nft.metadata.collection?.name === selectedCollection;
      
      return matchesSearch && matchesPrice && matchesRarity && matchesCollection;
    });
  }, [listings, searchTerm, filterPrice, selectedRarity, selectedCollection]);

  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'oldest':
        return a.createdAt - b.createdAt;
      default:
        return 0;
    }
  });

  if (loading && listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const clearFilters = () => {
    setSearchTerm('');
    setFilterPrice({ min: '', max: '' });
    setSelectedRarity('');
    setSelectedCollection('');
    setSortBy('newest');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Explore NFTs</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Discover unique digital collectibles</p>
          {stats && (
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <span className="text-primary-600 dark:text-primary-400">{stats.totalListings} items</span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-primary-600 dark:text-primary-400">Floor: {stats.floorPrice} {currency}</span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-primary-600 dark:text-primary-400">Volume: {stats.totalVolume.toFixed(1)} {currency}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search NFTs, collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-primary w-full pl-10"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-primary"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>

          {/* Price Range */}
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder={`Min ${currency}`}
              value={filterPrice.min}
              onChange={(e) => setFilterPrice(prev => ({ ...prev, min: e.target.value }))}
              className="input-primary flex-1"
            />
            <input
              type="number"
              placeholder={`Max ${currency}`}
              value={filterPrice.max}
              onChange={(e) => setFilterPrice(prev => ({ ...prev, max: e.target.value }))}
              className="input-primary flex-1"
            />
          </div>

          {/* Advanced Filters Toggle */}
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center justify-center space-x-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-primary-800/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rarity Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Rarity</label>
                <select
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value)}
                  className="input-primary w-full"
                >
                  <option value="">All Rarities</option>
                  {uniqueRarities.map(rarity => (
                    <option key={rarity} value={rarity}>{rarity}</option>
                  ))}
                </select>
              </div>

              {/* Collection Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Collection</label>
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="input-primary w-full"
                >
                  <option value="">All Collections</option>
                  {uniqueCollections.map(collection => (
                    <option key={collection} value={collection}>{collection}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Clear All</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-300">
          <span className="text-primary-600 dark:text-primary-400 font-semibold">{sortedListings.length}</span> NFTs found
          {searchTerm && <span className="ml-2">for "{searchTerm}"</span>}
        </p>
        
        {(searchTerm || selectedRarity || selectedCollection || filterPrice.min || filterPrice.max) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* NFT Grid */}
      <div className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
      }`}>
        {sortedListings.map((nft) => (
          <NFTCard
            key={nft.id}
            nft={nft}
            onBuy={(nft) => purchaseNFT(nft.id)}
          />
        ))}
      </div>

      {/* Load More */}
      {sortedListings.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" size="lg">
            Load More NFTs
          </Button>
        </div>
      )}
    </div>
  );
}