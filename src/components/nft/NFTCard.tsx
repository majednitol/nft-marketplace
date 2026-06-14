import React, { useState, useMemo, useCallback } from 'react';
import { Heart, ExternalLink, Music, Video } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { NFTListing } from '../../types/marketplace';
import { Button } from '../common/Button';
import { OptimizedImage } from '../common/OptimizedImage';
import { NFTDetailModal } from './NFTDetailModal';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useMarketplace } from '../../contexts/MarketplaceContext';

interface NFTCardProps {
  nft: NFTListing;
  onBuy?: (nft: NFTListing) => void;
  onList?: (nft: NFTListing) => void;
  onDelist?: (nft: NFTListing) => void;
  showActions?: boolean;
  isOwned?: boolean;
}

export const NFTCard = React.memo<NFTCardProps>(({ nft, onBuy, onList, onDelist, showActions = true, isOwned = false }) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { publicKey } = useWallet();
  const { delistNFT, activeChain } = useMarketplace();
  
  const walletAddress = useMemo(() => publicKey?.toBase58(), [publicKey]);
  const isActuallyOwned = useMemo(() => isOwned || (walletAddress && nft.seller === walletAddress), [isOwned, walletAddress, nft.seller]);
  
  // Memoize expensive computations
  const rarityAttribute = useMemo(() => 
    nft.metadata.attributes?.find(attr => attr.trait_type === 'Rarity'),
    [nft.metadata.attributes]
  );
  
  const displayAttributes = useMemo(() => 
    nft.metadata.attributes?.slice(0, 2) || [],
    [nft.metadata.attributes]
  );
  
  const isNFTFavorite = useMemo(() => 
    isFavorite(nft.id),
    [isFavorite, nft.id]
  );
  
  const mediaType = useMemo(() => {
    const animationUrl = nft.metadata.animationUrl || nft.metadata.animation_url;
    if (!animationUrl) return 'image';
    
    // Check Format attribute first (highly reliable)
    const formatAttr = nft.metadata.attributes?.find(
      (a) => a.trait_type === 'Format' || a.trait_type === 'Media Type'
    );
    if (formatAttr?.value === 'Audio') return 'audio';
    if (formatAttr?.value === 'Video') return 'video';
    
    // Fallback: URL extension/type checks
    const cleanUrl = animationUrl.split('?')[0].split('#')[0].toLowerCase();
    if (cleanUrl.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/) || cleanUrl.includes('/audio/')) return 'audio';
    if (cleanUrl.match(/\.(mp4|webm|mov|ogv|m4v)$/) || cleanUrl.includes('/video/')) return 'video';
    if (animationUrl.startsWith('data:audio/')) return 'audio';
    if (animationUrl.startsWith('data:video/')) return 'video';
    
    return 'image';
  }, [nft.metadata.animationUrl, nft.metadata.animation_url, nft.metadata.attributes]);
  
  // Memoize event handlers
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = 'https://images.pexels.com/photos/4000000/pexels-photo-4000000.jpeg?auto=compress&cs=tinysrgb&w=400';
  }, []);

  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent modal from opening
    if (isNFTFavorite) {
      removeFromFavorites(nft.id);
    } else {
      addToFavorites(nft);
    }
  }, [isNFTFavorite, removeFromFavorites, addToFavorites, nft]);
  
  const handleModalOpen = useCallback(() => {
    setShowDetailModal(true);
  }, []);
  
  const handleModalClose = useCallback(() => {
    setShowDetailModal(false);
  }, []);
  
  const handleExplorerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeChain === 'evm') {
      if (nft.nftMint.includes('-')) {
        const [contractAddress, tokenId] = nft.nftMint.split('-');
        window.open(`https://sepolia.etherscan.io/token/${contractAddress}?a=${tokenId}`, '_blank');
      } else {
        window.open(`https://sepolia.etherscan.io/address/${nft.nftMint}`, '_blank');
      }
    } else {
      window.open(`https://explorer.solana.com/address/${nft.nftMint}?cluster=devnet`, '_blank');
    }
  }, [nft.nftMint, activeChain]);
  
  const handleBuyClick = useCallback(() => {
    onBuy?.(nft);
  }, [onBuy, nft]);
  
  const handleListClick = useCallback(() => {
    onList?.(nft);
  }, [onList, nft]);
  
  const handleDelistClick = useCallback(() => {
    if (onDelist) {
      onDelist(nft);
    } else {
      delistNFT(nft.id);
    }
  }, [onDelist, delistNFT, nft]);

  return (
    <div className="card card-hover group animate-fade-in">
      {/* Image */}
      <div 
        className="relative aspect-square overflow-hidden rounded-t-xl cursor-pointer"
        onClick={handleModalOpen}
      >
        <OptimizedImage
          src={nft.metadata.image}
          alt={nft.metadata.name}
          className="group-hover:scale-105 transition-transform duration-300"
          width={400}
          height={400}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <button 
            onClick={handleFavoriteToggle}
            className="p-2 glass rounded-full hover:bg-white/20 transition-colors"
          >
            <Heart 
              className={`h-4 w-4 transition-colors ${
                isNFTFavorite 
                  ? 'text-red-400 fill-current' 
                  : 'text-white'
              }`} 
            />
          </button>
        </div>
        
        {/* Rarity badge */}
        {rarityAttribute && (
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-medium rounded-lg backdrop-blur-sm border border-primary-500/30">
              {rarityAttribute.value || 'Common'}
            </span>
          </div>
        )}

        {/* Media type badge */}
        {mediaType !== 'image' && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className="flex items-center space-x-1 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-semibold rounded-lg border border-white/10 shadow-lg">
              {mediaType === 'audio' ? (
                <>
                  <Music className="h-3.5 w-3.5 text-primary-400 animate-pulse" />
                  <span>Audio</span>
                </>
              ) : (
                <>
                  <Video className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Video</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {nft.metadata.name}
            </h3>
            {nft.metadata.collection && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {nft.metadata.collection.name}
              </p>
            )}
          </div>
          <button 
            className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-dark-300/50 rounded-lg transition-colors"
            onClick={handleExplorerClick}
            title={`View on ${activeChain === 'evm' ? 'Etherscan' : 'Solana Explorer'}`}
          >
            <ExternalLink className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {nft.price} <span className="text-sm font-normal text-primary-600 dark:text-primary-400">{activeChain === 'evm' ? 'ETH' : 'SOL'}</span>
            </p>
          </div>
        </div>

        {/* Attributes */}
        {displayAttributes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {displayAttributes.map((attr, index) => (
              <span
                key={`${attr.trait_type}-${attr.value}-${index}`}
                className="px-2 py-1 bg-primary-900/30 text-primary-300 text-xs rounded-lg border border-primary-800/30"
              >
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex space-x-2">
            {isActuallyOwned ? (
              nft.price > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-500 hover:text-red-600 border-red-500/25 hover:border-red-500/50"
                  onClick={handleDelistClick}
                >
                  Delist
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleListClick}
                >
                  List for Sale
                </Button>
              )
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={handleBuyClick}
              >
                Buy Now
              </Button>
            )}
          </div>
        )}
      </div>

      {/* NFT Detail Modal */}
      <NFTDetailModal
        nft={nft}
        isOpen={showDetailModal}
        onClose={handleModalClose}
        onBuy={onBuy}
        onList={onList}
        onDelist={onDelist || (() => delistNFT(nft.id))}
        isOwned={isActuallyOwned}
      />
    </div>
  );
});