import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Copy, Heart, Share2, Eye, Clock, Zap, Play, Pause, Volume2, VolumeX, Music, Video } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { NFTListing } from '../../types/marketplace';
import { Button } from '../common/Button';
import { SocialShareButton } from '../common/SocialShare';
import { MobileModal, MobileTabs, useIsMobile } from '../mobile/MobileOptimizations';
import { useMarketplace } from '../../contexts/MarketplaceContext';

interface NFTMediaViewerProps {
  image: string;
  animationUrl?: string;
  attributes?: any[];
  name: string;
  className?: string;
}

function NFTMediaViewer({ image, animationUrl, attributes, name, className = "" }: NFTMediaViewerProps) {
  const mediaType = useMemo(() => {
    if (!animationUrl) return 'image';
    
    // Check Format attribute first
    const formatAttr = attributes?.find(
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
  }, [animationUrl, attributes]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (mediaType !== 'audio' || !animationUrl) return;
    
    const audio = new Audio(animationUrl);
    audioRef.current = audio;
    audio.volume = volume;
    audio.muted = isMuted;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [animationUrl, mediaType]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error("Audio playback failed:", err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const vol = parseFloat(e.target.value);
    audioRef.current.volume = vol;
    setVolume(vol);
    if (vol > 0) {
      audioRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    audioRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = 'https://images.pexels.com/photos/4000000/pexels-photo-4000000.jpeg?auto=compress&cs=tinysrgb&w=800';
  };

  if (mediaType === 'video' && animationUrl) {
    return (
      <div className={`relative aspect-square w-full bg-black overflow-hidden ${className}`}>
        <video
          src={animationUrl}
          poster={image}
          controls
          loop
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  if (mediaType === 'audio' && animationUrl) {
    return (
      <div className={`relative aspect-square w-full overflow-hidden flex flex-col justify-between bg-dark-900/40 ${className}`}>
        {/* Style block for simulated audio wave */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes soundWave {
            0%, 100% { transform: scaleY(0.15); }
            50% { transform: scaleY(1); }
          }
          .wave-bar {
            transform-origin: bottom;
            animation: soundWave 1.2s ease-in-out infinite;
          }
        `}} />

        {/* Cover Art Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={image}
            alt={name}
            onError={handleImageError}
            className="w-full h-full object-cover filter blur-md scale-105 opacity-40"
          />
        </div>

        {/* Player Header */}
        <div className="z-10 p-4 flex justify-between items-start">
          <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-semibold rounded-lg border border-white/10 shadow-lg">
            <Music className="h-4 w-4 text-primary-400 animate-pulse" />
            <span>Audio NFT Track</span>
          </span>
        </div>

        {/* Center Cover Art Disk */}
        <div className="z-10 flex flex-col items-center justify-center flex-1 py-4">
          <div className={`relative w-44 h-44 rounded-full border-4 border-white/10 shadow-2xl overflow-hidden transition-transform duration-1000 ${isPlaying ? 'rotate-slow' : ''}`}>
            {/* Rotate Animation CSS inline */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes rot {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .rotate-slow {
                animation: rot 15s linear infinite;
              }
            `}} />
            <img
              src={image}
              alt={name}
              onError={handleImageError}
              className="w-full h-full object-cover"
            />
            {/* Center Hole of vinyl record */}
            <div className="absolute inset-0 m-auto w-8 h-8 bg-dark-950 border-2 border-white/10 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>

        {/* Wave visualizer */}
        <div className="z-10 px-6 h-12 flex items-end justify-center space-x-1 opacity-80 mb-2">
          {Array.from({ length: 24 }).map((_, i) => {
            const delay = `${(i * 0.05).toFixed(2)}s`;
            const duration = `${(0.6 + (i % 5) * 0.15).toFixed(2)}s`;
            const height = `${15 + (i % 7) * 4}px`;
            return (
              <div
                key={i}
                className="wave-bar w-1 bg-gradient-to-t from-primary-500 to-indigo-400 rounded-t-sm"
                style={{
                  height,
                  animationDelay: isPlaying ? delay : '0s',
                  animationDuration: duration,
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  transform: !isPlaying ? 'scaleY(0.15)' : undefined
                }}
              />
            );
          })}
        </div>

        {/* Player controls bar */}
        <div className="z-10 p-4 bg-black/60 backdrop-blur-md border-t border-white/10 flex flex-col space-y-3">
          {/* Progress Timeline Slider */}
          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-mono text-gray-400 w-8 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <span className="text-[10px] font-mono text-gray-400 w-8">
              {formatTime(duration)}
            </span>
          </div>

          {/* Main Controls Row */}
          <div className="flex items-center justify-between">
            {/* Volume control */}
            <div className="flex items-center space-x-2 w-24">
              <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>

            {/* Play Button */}
            <button
              onClick={togglePlay}
              className="p-3 bg-gradient-to-r from-primary-600 to-indigo-650 hover:from-primary-500 hover:to-indigo-550 text-white rounded-full shadow-lg transform active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </button>

            {/* Right Spacer (for visual symmetry) */}
            <div className="w-24 flex justify-end">
              <span className="text-[10px] text-gray-400 font-medium tracking-wide bg-white/5 px-2 py-1 rounded">
                MP3 AUDIO
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to standard Image
  return (
    <div className={`relative aspect-square w-full ${className}`}>
      <img
        src={image}
        alt={name}
        onError={handleImageError}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

interface NFTDetailModalProps {
  nft: NFTListing;
  isOpen: boolean;
  onClose: () => void;
  onBuy?: (nft: NFTListing) => void;
  onList?: (nft: NFTListing) => void;
  onDelist?: (nft: NFTListing) => void;
  isOwned?: boolean;
}

export function NFTDetailModal({ 
  nft, 
  isOpen, 
  onClose, 
  onBuy, 
  onList, 
  onDelist, 
  isOwned = false 
}: NFTDetailModalProps) {
  const { publicKey } = useWallet();
  const { delistNFT, purchaseNFT, activeChain } = useMarketplace();
  const currency = activeChain === 'evm' ? 'ETH' : 'SOL';

  const handleExplorerClick = () => {
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
  };
  
  const walletAddress = publicKey?.toBase58();
  const isActuallyOwned = isOwned || (walletAddress && nft.seller === walletAddress);

  const [activeTab, setActiveTab] = useState<'details' | 'attributes' | 'history'>('details');
  const [showFullImage, setShowFullImage] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isOpen || !nft?.nftMint) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${apiUrl}/listings/${nft.nftMint}/history`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        } else {
          console.warn('Failed to fetch transaction history, status:', response.status);
          setHistory([]);
        }
      } catch (error) {
        console.error('Failed to fetch transaction history:', error);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [isOpen, nft?.nftMint]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Add toast notification here
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };


  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'attributes', label: 'Traits' },
    { id: 'history', label: 'History' }
  ];

  if (isMobile) {
    return createPortal(
      <MobileModal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={nft.metadata.name}
        fullScreen={true}
      >
        <div className="p-4 space-y-6">
          {/* Mobile Image */}
          <div className="aspect-square relative">
            <NFTMediaViewer
              image={nft.metadata.image}
              animationUrl={nft.metadata.animationUrl || nft.metadata.animation_url}
              attributes={nft.metadata.attributes}
              name={nft.metadata.name}
              className="rounded-xl"
            />
            
            {/* Mobile Actions */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <button 
                onClick={() => setShowFullImage(true)}
                className="p-2 glass rounded-full"
              >
                <Eye className="h-4 w-4 text-white" />
              </button>
              <SocialShareButton nft={nft} size="md" className="glass rounded-full" />
            </div>

            {/* Rarity Badge */}
            {nft.metadata.attributes && (
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium rounded-lg">
                  {nft.metadata.attributes.find(attr => attr.trait_type === 'Rarity')?.value || 'Common'}
                </span>
              </div>
            )}
          </div>

          {/* Mobile Price & Actions */}
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-400">Current Price</p>
              <p className="text-2xl font-bold text-white">
                {nft.price} <span className="text-lg text-primary-400">{currency}</span>
              </p>
              <p className="text-sm text-gray-400">
                ≈ ${(nft.price * 100).toFixed(2)} USD
              </p>
            </div>
            
            <div className="flex space-x-3 w-full">
              {isActuallyOwned ? (
                nft.price > 0 ? (
                  <Button 
                    variant="secondary" 
                    size="lg"
                    className="flex-1 text-red-500 hover:text-red-650"
                    onClick={() => onDelist ? onDelist(nft) : delistNFT(nft.id)}
                  >
                    Delist
                  </Button>
                ) : (
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="flex-1"
                    onClick={() => onList && onList(nft)}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    List for Sale
                  </Button>
                )
              ) : (
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="flex-1"
                  onClick={() => onBuy ? onBuy(nft) : purchaseNFT(nft.id)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Buy Now
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Tabs */}
          <MobileTabs 
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as any)}
          />

          {/* Mobile Tab Content */}
          <div className="min-h-[300px]">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {nft.metadata.description || 'No description available for this NFT.'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-dark-400/30 rounded-lg">
                      <span className="text-gray-400">Mint Address</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-mono text-sm">{formatAddress(nft.nftMint)}</span>
                        <button onClick={() => copyToClipboard(nft.nftMint)}>
                          <Copy className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-dark-400/30 rounded-lg">
                      <span className="text-gray-400">Owner</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-primary-400 text-sm">{formatAddress(nft.seller)}</span>
                        <button onClick={() => copyToClipboard(nft.seller)}>
                          <Copy className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'attributes' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Attributes</h3>
                <div className="space-y-3">
                  {nft.metadata.attributes?.map((attr, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-dark-400/30 rounded-lg">
                      <span className="text-primary-400 text-sm font-medium uppercase tracking-wide">
                        {attr.trait_type}
                      </span>
                      <span className="text-white font-semibold">{attr.value}</span>
                    </div>
                  )) || (
                    <p className="text-gray-400 text-center py-8">No attributes available.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-400 text-sm">Loading history...</p>
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No transaction history found.</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((tx, index) => (
                      <div key={index} className="p-4 bg-dark-400/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              tx.type === 'sale' ? 'bg-green-400' : 
                              tx.type === 'list' ? 'bg-blue-400' : 
                              tx.type === 'delist' ? 'bg-red-400' : 'bg-purple-400'
                            }`} />
                            <span className="text-white font-medium capitalize">{tx.type}</span>
                            {tx.price && (
                              <span className="text-primary-400 font-semibold">{tx.price} {currency}</span>
                            )}
                          </div>
                          <span className="text-gray-400 text-sm">{tx.date}</span>
                        </div>
                        
                        <div className="text-sm text-gray-300 space-y-1">
                          <div className="flex justify-between">
                            <span>From:</span>
                            <span>{tx.from ? formatAddress(tx.from) : 'Unknown'}</span>
                          </div>
                          {tx.to && (
                            <div className="flex justify-between">
                              <span>To:</span>
                              <span>{formatAddress(tx.to)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </MobileModal>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="card p-0 flex flex-col lg:flex-row">
          {/* Image Section */}
          <div className="lg:w-1/2 relative">
            <div className="aspect-square relative group">
              <NFTMediaViewer
                image={nft.metadata.image}
                animationUrl={nft.metadata.animationUrl || nft.metadata.animation_url}
                attributes={nft.metadata.attributes}
                name={nft.metadata.name}
                className="rounded-l-xl"
              />
              
              {/* Image Actions */}
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setShowFullImage(true)}
                  className="p-2 glass rounded-full hover:bg-white/20"
                >
                  <Eye className="h-4 w-4 text-white" />
                </button>
                <SocialShareButton 
                  nft={nft} 
                  size="md" 
                  className="glass rounded-full hover:bg-white/20"
                />
              </div>

              {/* Rarity Badge */}
              {nft.metadata.attributes && (
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium rounded-lg">
                    {nft.metadata.attributes.find(attr => attr.trait_type === 'Rarity')?.value || 'Common'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="lg:w-1/2 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-primary-800/30">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-2">{nft.metadata.name}</h1>
                  {nft.metadata.collection && (
                    <p className="text-primary-400 text-sm">
                      Collection: {nft.metadata.collection.name}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-dark-300/50 rounded-lg transition-colors">
                    <Heart className="h-5 w-5 text-gray-400" />
                  </button>
                  <button onClick={onClose} className="p-2 hover:bg-dark-300/50 rounded-lg transition-colors">
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Price & Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Current Price</p>
                    <p className="text-3xl font-bold text-white">
                      {nft.price} <span className="text-lg text-primary-400">{currency}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      ≈ ${(nft.price * 100).toFixed(2)} USD
                    </p>
                  </div>
                  
                  <div className="text-right text-sm">
                    <p className="text-gray-400">Owned by</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-primary-400">{formatAddress(nft.seller)}</span>
                      <button onClick={() => copyToClipboard(nft.seller)}>
                        <Copy className="h-4 w-4 text-gray-400 hover:text-gray-300" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {isActuallyOwned ? (
                    nft.price > 0 ? (
                      <Button 
                        variant="secondary" 
                        size="lg"
                        className="flex-1 text-red-500 hover:text-red-655"
                        onClick={() => onDelist ? onDelist(nft) : delistNFT(nft.id)}
                      >
                        Delist
                      </Button>
                    ) : (
                      <Button 
                        variant="primary" 
                        size="lg" 
                        className="flex-1"
                        onClick={() => onList && onList(nft)}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        List for Sale
                      </Button>
                    )
                  ) : (
                    <Button 
                      variant="primary" 
                      size="lg" 
                      className="flex-1"
                      onClick={() => onBuy ? onBuy(nft) : purchaseNFT(nft.id)}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Buy Now
                    </Button>
                  )}
                  
                  <Button 
                    variant="secondary" 
                    size="lg"
                    onClick={handleExplorerClick}
                    title={`View on ${activeChain === 'evm' ? 'Etherscan' : 'Solana Explorer'}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-primary-800/30">
              {['details', 'attributes', 'history'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-primary-400 border-b-2 border-primary-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {nft.metadata.description || 'No description available for this NFT.'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mint Address</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-mono">{formatAddress(nft.nftMint)}</span>
                          <button onClick={() => copyToClipboard(nft.nftMint)}>
                            <Copy className="h-4 w-4 text-gray-400 hover:text-gray-300" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Token Standard</span>
                        <span className="text-white">{activeChain === 'evm' ? 'ERC-721' : 'Metaplex'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Listed Date</span>
                        <span className="text-white">{new Date(nft.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'attributes' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Attributes</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {nft.metadata.attributes?.map((attr, index) => (
                      <div key={index} className="card p-3 text-center">
                        <p className="text-primary-400 text-sm font-medium uppercase tracking-wide">
                          {attr.trait_type}
                        </p>
                        <p className="text-white font-semibold mt-1">{attr.value}</p>
                      </div>
                    )) || (
                      <p className="text-gray-400 col-span-2">No attributes available.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
                  {loadingHistory ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-400 text-sm">Loading history...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No transaction history found.</p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((tx, index) => (
                        <div key={index} className="card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                tx.type === 'sale' ? 'bg-green-400' : 
                                tx.type === 'list' ? 'bg-blue-400' : 
                                tx.type === 'delist' ? 'bg-red-400' : 'bg-purple-400'
                              }`} />
                              <span className="text-white font-medium capitalize">{tx.type}</span>
                              {tx.price && (
                                <span className="text-primary-400 font-semibold">{tx.price} {currency}</span>
                              )}
                            </div>
                            <span className="text-gray-400 text-sm">{tx.date}</span>
                          </div>
                          
                          <div className="text-sm text-gray-300 space-y-1">
                            <div className="flex justify-between">
                              <span>From:</span>
                              <span>{tx.from ? formatAddress(tx.from) : 'Unknown'}</span>
                            </div>
                            {tx.to && (
                              <div className="flex justify-between">
                                <span>To:</span>
                                <span>{formatAddress(tx.to)}</span>
                              </div>
                            )}
                             {tx.txHash && (
                              <div className="flex justify-between">
                                <span>Transaction:</span>
                                <button 
                                  onClick={() => {
                                    if (activeChain === 'evm') {
                                      window.open(`https://sepolia.etherscan.io/tx/${tx.txHash}`, '_blank');
                                    } else {
                                      window.open(`https://explorer.solana.com/tx/${tx.txHash}?cluster=devnet`, '_blank');
                                    }
                                  }}
                                  className="text-primary-400 hover:text-primary-300 flex items-center space-x-1"
                                  title={`View on ${activeChain === 'evm' ? 'Etherscan' : 'Solana Explorer'}`}
                                >
                                  <span>{formatAddress(tx.txHash)}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
          <button 
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
          <img 
            src={nft.metadata.image} 
            alt={nft.metadata.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>,
    document.body
  );
}