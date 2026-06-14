import React, { useState } from 'react';
import { Share2, Twitter, MessageCircle, Link, Copy, X } from 'lucide-react';
import { NFTListing } from '../../types/marketplace';
import { Button } from './Button';
import { MobileModal, useIsMobile } from '../mobile/MobileOptimizations';
import { useMarketplace } from '../../contexts/MarketplaceContext';

interface SocialShareProps {
  nft: NFTListing;
  isOpen: boolean;
  onClose: () => void;
}

export function SocialShare({ nft, isOpen, onClose }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();
  const { activeChain } = useMarketplace();
  const currency = activeChain === 'evm' ? 'ETH' : 'SOL';

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/nft/${nft.id}`;
  const shareText = `Check out this amazing NFT: ${nft.metadata.name} for ${nft.price} ${currency} on NFT Nexus!`;

  const shareOptions = [
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
      }
    },
    {
      name: 'Discord',
      icon: MessageCircle,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      action: () => {
        // Copy to clipboard for Discord sharing
        copyToClipboard(`${shareText}\n${shareUrl}`);
      }
    },
    {
      name: 'Copy Link',
      icon: Link,
      color: 'bg-gray-500 hover:bg-gray-600',
      action: () => copyToClipboard(shareUrl)
    }
  ];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const generateEmbedCode = () => {
    return `<iframe src="${shareUrl}/embed" width="400" height="600" frameborder="0"></iframe>`;
  };

  if (isMobile) {
    return (
      <MobileModal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Share NFT"
      >
        <div className="p-4 space-y-6">
          {/* NFT Preview */}
          <div className="flex items-center space-x-3 p-3 bg-dark-400/30 rounded-lg">
            <img
              src={nft.metadata.image}
              alt={nft.metadata.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{nft.metadata.name}</p>
              <p className="text-primary-400 text-sm">{nft.price} {currency}</p>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-medium">Share on social media</p>
            <div className="space-y-3">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={option.action}
                  className={`flex items-center space-x-3 p-4 rounded-lg transition-colors ${option.color} text-white w-full tap-highlight-none`}
                >
                  <option.icon className="h-5 w-5" />
                  <span className="font-medium">{option.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Link */}
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-medium">Direct link</p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="input-primary flex-1 text-sm"
              />
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => copyToClipboard(shareUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Success Message */}
          {copied && (
            <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm text-center">
                ✓ Copied to clipboard!
              </p>
            </div>
          )}
        </div>
      </MobileModal>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md">
        <div className="card p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Share2 className="h-5 w-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">Share NFT</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-dark-300/50 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* NFT Preview */}
          <div className="flex items-center space-x-3 mb-6 p-3 bg-dark-400/30 rounded-lg">
            <img
              src={nft.metadata.image}
              alt={nft.metadata.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{nft.metadata.name}</p>
              <p className="text-primary-400 text-sm">{nft.price} {currency}</p>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-3 mb-6">
            <p className="text-gray-400 text-sm font-medium">Share on social media</p>
            <div className="grid grid-cols-1 gap-3">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={option.action}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${option.color} text-white`}
                >
                  <option.icon className="h-5 w-5" />
                  <span className="font-medium">{option.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Link */}
          <div className="space-y-3 mb-6">
            <p className="text-gray-400 text-sm font-medium">Direct link</p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="input-primary flex-1 text-sm"
              />
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => copyToClipboard(shareUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Embed Code */}
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-medium">Embed code</p>
            <div className="relative">
              <textarea
                value={generateEmbedCode()}
                readOnly
                rows={3}
                className="input-primary w-full text-sm font-mono resize-none"
              />
              <button
                onClick={() => copyToClipboard(generateEmbedCode())}
                className="absolute top-2 right-2 p-1 hover:bg-dark-300/50 rounded transition-colors"
              >
                <Copy className="h-3 w-3 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Success Message */}
          {copied && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm text-center">
                ✓ Copied to clipboard!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Social Share Button Component
interface SocialShareButtonProps {
  nft: NFTListing;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SocialShareButton({ nft, size = 'md', className }: SocialShareButtonProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <>
      <button
        onClick={() => setShowShareModal(true)}
        className={`hover:bg-dark-300/50 rounded-lg transition-colors ${sizeClasses[size]} ${className}`}
        title="Share NFT"
      >
        <Share2 className={`text-gray-400 hover:text-gray-300 ${iconSizes[size]}`} />
      </button>

      <SocialShare
        nft={nft}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
}