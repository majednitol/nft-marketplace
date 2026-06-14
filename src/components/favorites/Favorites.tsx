import React, { useState } from 'react';
import { Heart, Search, Grid, List, Trash2, Eye } from 'lucide-react';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { NFTCard } from '../nft/NFTCard';
import { Button } from '../common/Button';

interface FavoritesProps {
  onViewChange?: (view: string) => void;
}

export function Favorites({ onViewChange }: FavoritesProps = {}) {
  const { favorites, clearFavorites } = useFavorites();
  const { purchaseNFT, activeChain } = useMarketplace();
  const currency = activeChain === 'evm' ? 'ETH' : 'SOL';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFavorites = favorites.filter(nft =>
    nft.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (nft.metadata.collection?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
            <Heart className="h-8 w-8 text-red-400 fill-current" />
            <span>My Favorites</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {favorites.length} NFT{favorites.length !== 1 ? 's' : ''} in your watchlist
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {favorites.length > 0 && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={clearFavorites}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
          
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
      </div>

      {favorites.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gray-100 dark:bg-dark-400/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-200 dark:border-primary-800/30">
            <Heart className="h-12 w-12 text-gray-500 dark:text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Favorites Yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Start exploring and click the heart icon on NFTs you're interested in to add them to your watchlist.
          </p>
          <Button variant="primary">
            <Search className="h-4 w-4 mr-2" />
            Explore NFTs
          </Button>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search your favorites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-primary w-full pl-10"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 text-center">
              <Heart className="h-8 w-8 text-red-400 fill-current mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{favorites.length}</p>
              <p className="text-gray-550 dark:text-gray-400 text-sm">Total Favorites</p>
            </div>
            
            <div className="card p-6 text-center">
              <Eye className="h-8 w-8 text-primary-600 dark:text-primary-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredFavorites.length}</p>
              <p className="text-gray-550 dark:text-gray-400 text-sm">Showing</p>
            </div>
            
            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white text-sm font-bold">Σ</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {favorites.reduce((sum, nft) => sum + nft.price, 0).toFixed(1)}
              </p>
              <p className="text-gray-550 dark:text-gray-400 text-sm">Total Value ({currency})</p>
            </div>
          </div>

          {/* Results */}
          <div className="flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-300">
              <span className="text-primary-600 dark:text-primary-400 font-semibold">{filteredFavorites.length}</span> favorite{filteredFavorites.length !== 1 ? 's' : ''} found
              {searchTerm && <span className="ml-2">for "{searchTerm}"</span>}
            </p>
          </div>

          {/* Favorites Grid */}
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {filteredFavorites.map((nft) => (
              <NFTCard
                key={nft.id}
                nft={nft}
                onBuy={(nft) => purchaseNFT(nft.id)}
                showActions={true}
              />
            ))}
          </div>

          {filteredFavorites.length === 0 && searchTerm && (
              <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-dark-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200 dark:border-primary-800/30">
                <Search className="h-8 w-8 text-gray-550 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Results Found</h3>
              <p className="text-gray-550 dark:text-gray-400">Try adjusting your search term</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchTerm('')}
                className="mt-3"
              >
                Clear Search
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}