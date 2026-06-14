import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  Edit, 
  Trash2, 
  Send,
  ExternalLink,
  Copy,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  History
} from 'lucide-react';
import { NFTListing } from '../../types/marketplace';
import { NFTCard } from '../nft/NFTCard';
import { Button } from '../common/Button';
import { NFTDetailModal } from '../nft/NFTDetailModal';
import { useMarketplace } from '../../contexts/MarketplaceContext';

interface PortfolioTabsProps {
  activeTab: string;
  filteredOwnedNFTs: NFTListing[];
  filteredListedNFTs: NFTListing[];
  userPurchases: any[];
  viewMode: 'grid' | 'list';
  bulkActionMode: boolean;
  selectedNFTs: Set<string>;
  searchTerm: string;
  sortBy: string;
  filterCollection: string;
  uniqueCollections: string[];
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onToggleSelection: (nftId: string) => void;
  onSelectAll: () => void;
  onBulkList: () => void;
  onListNFT: (nft: NFTListing) => void;
  onDelistNFT: (nft: NFTListing) => void;
}

export function PortfolioTabs({
  activeTab,
  filteredOwnedNFTs,
  filteredListedNFTs,
  userPurchases,
  viewMode,
  bulkActionMode,
  selectedNFTs,
  searchTerm,
  sortBy,
  filterCollection,
  uniqueCollections,
  onSearchChange,
  onSortChange,
  onFilterChange,
  onToggleSelection,
  onSelectAll,
  onBulkList,
  onListNFT,
  onDelistNFT,
}: PortfolioTabsProps) {
  const { activeChain } = useMarketplace();
  const currency = activeChain === 'evm' ? 'ETH' : 'SOL';
  
  const formatAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;
  const [selectedNFTForDetail, setSelectedNFTForDetail] = useState<NFTListing | null>(null);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (activeTab === 'owned') {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search your NFTs..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-primary w-full pl-10"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="input-primary"
          >
            <option value="newest">Newest First</option>
            <option value="name">Name A-Z</option>
            <option value="price-high">Highest Value</option>
            <option value="price-low">Lowest Value</option>
          </select>
          
          <select
            value={filterCollection}
            onChange={(e) => onFilterChange(e.target.value)}
            className="input-primary"
          >
            <option value="">All Collections</option>
            {uniqueCollections.map(collection => (
              <option key={collection} value={collection}>{collection}</option>
            ))}
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {bulkActionMode && (
          <div className="flex items-center justify-between p-4 card">
            <div className="flex items-center space-x-4">
              <button
                onClick={onSelectAll}
                className="flex items-center space-x-2 text-primary-400 hover:text-primary-300"
              >
                {selectedNFTs.size === filteredOwnedNFTs.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>Select All ({selectedNFTs.size})</span>
              </button>
            </div>
            
            {selectedNFTs.size > 0 && (
              <div className="flex space-x-2">
                <Button variant="primary" size="sm" onClick={onBulkList}>
                  <Edit className="h-4 w-4 mr-2" />
                  List Selected ({selectedNFTs.size})
                </Button>
                <Button variant="secondary" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Transfer
                </Button>
              </div>
            )}
          </div>
        )}

        {/* NFT Grid/List */}
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {filteredOwnedNFTs.map((nft) => (
            <div key={nft.id} className="relative">
              {bulkActionMode && (
                <div className="absolute top-3 left-3 z-10">
                  <button
                    onClick={() => onToggleSelection(nft.id)}
                    className="p-2 glass rounded-full"
                  >
                    {selectedNFTs.has(nft.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary-400" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              )}
              <NFTCard
                nft={nft}
                onList={onListNFT}
                isOwned
                showActions={!bulkActionMode}
              />
            </div>
          ))}
        </div>

        {filteredOwnedNFTs.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-dark-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No NFTs Found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'listed') {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search listed NFTs..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-primary w-full pl-10"
            />
          </div>
        </div>

        {/* Listed NFTs */}
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {filteredListedNFTs.map((nft) => (
            <NFTCard
              key={nft.id}
              nft={nft}
              onDelist={onDelistNFT}
              isOwned
            />
          ))}
        </div>

        {filteredListedNFTs.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-dark-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Listed NFTs</h3>
            <p className="text-gray-400">Start listing your NFTs to see them here</p>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'purchases') {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {userPurchases.map((purchase) => (
            <div key={purchase.id} className="card p-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  <img
                    src={purchase.nft?.metadata?.image || ''}
                    alt={purchase.nft?.metadata?.name || 'NFT'}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {purchase.nft?.metadata?.name || 'Unnamed NFT'}
                    </h3>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {purchase.currentValue > purchase.purchasePrice ? (
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                        <span className={`text-sm font-medium ${
                          purchase.currentValue > purchase.purchasePrice ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {((purchase.currentValue - purchase.purchasePrice) / purchase.purchasePrice * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Purchase Price</p>
                      <p className="text-white font-semibold">{purchase.purchasePrice} {currency}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Current Value</p>
                      <p className="text-white font-semibold">{purchase.currentValue} {currency}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Purchase Date</p>
                      <p className="text-white">{new Date(purchase.purchaseDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Seller</p>
                      <div className="flex items-center space-x-1">
                        <span className="text-primary-400">{formatAddress(purchase.seller)}</span>
                        <button onClick={() => copyToClipboard(purchase.seller)}>
                          <Copy className="h-3 w-3 text-gray-400 hover:text-gray-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <button 
                      onClick={() => {
                        if (activeChain === 'evm') {
                          window.open(`https://sepolia.etherscan.io/tx/${purchase.transactionHash}`, '_blank');
                        } else {
                          window.open(`https://explorer.solana.com/tx/${purchase.transactionHash}?cluster=devnet`, '_blank');
                        }
                      }}
                      className="text-primary-400 hover:text-primary-300 flex items-center space-x-1"
                      title={`View on ${activeChain === 'evm' ? 'Etherscan' : 'Solana Explorer'}`}
                    >
                      <span className="text-sm">View Transaction</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => setSelectedNFTForDetail(purchase.nft)}
                      >
                        View Details
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => onListNFT(purchase.nft)}>
                        List for Sale
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {userPurchases.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-dark-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Purchase History</h3>
            <p className="text-gray-400">Your NFT purchases will appear here</p>
          </div>
        )}

        {selectedNFTForDetail && (
          <NFTDetailModal
            nft={selectedNFTForDetail}
            isOpen={!!selectedNFTForDetail}
            onClose={() => setSelectedNFTForDetail(null)}
            isOwned={true}
            onList={onListNFT}
          />
        )}
      </div>
    );
  }

  if (activeTab === 'analytics') {
    const totalSpent = userPurchases.reduce((sum, p) => sum + p.purchasePrice, 0);
    const currentValue = userPurchases.reduce((sum, p) => sum + p.currentValue, 0);
    const totalPnL = currentValue - totalSpent;
    
    return (
      <div className="space-y-6">
        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Total Invested</h3>
            <p className="text-3xl font-bold text-primary-400">{totalSpent.toFixed(2)} {currency}</p>
            <p className="text-sm text-gray-400 mt-1">Across {userPurchases.length} purchases</p>
          </div>
          
          <div className="card p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Current Value</h3>
            <p className="text-3xl font-bold text-white">{currentValue.toFixed(2)} {currency}</p>
            <p className="text-sm text-gray-400 mt-1">Market valuation</p>
          </div>
          
          <div className="card p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Total P&L</h3>
            <p className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} {currency}
            </p>
            <p className={`text-sm mt-1 ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalSpent > 0 ? ((totalPnL / totalSpent) * 100).toFixed(1) : 0}% return
            </p>
          </div>
        </div>

        {/* Top Performing NFTs */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Performing NFTs</h3>
          <div className="space-y-4">
            {userPurchases
              .sort((a, b) => (b.currentValue - b.purchasePrice) - (a.currentValue - a.purchasePrice))
              .slice(0, 5)
              .map((purchase) => {
                const pnl = purchase.currentValue - purchase.purchasePrice;
                const pnlPercent = (pnl / purchase.purchasePrice) * 100;
                
                return (
                  <div key={purchase.id} className="flex items-center justify-between p-3 bg-dark-400/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <img
                        src={purchase.nft?.metadata?.image || ''}
                        alt={purchase.nft?.metadata?.name || 'NFT'}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="text-white font-medium">{purchase.nft?.metadata?.name || 'Unnamed NFT'}</p>
                        <p className="text-gray-400 text-sm">{purchase.purchasePrice} {currency} → {purchase.currentValue} {currency}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} {currency}
                      </p>
                      <p className={`text-sm ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}