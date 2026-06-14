import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Calculator, Clock, Zap } from 'lucide-react';
import { NFTListing } from '../../types/marketplace';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useMarketplace } from '../../contexts/MarketplaceContext';

interface ListNFTModalProps {
  nft: NFTListing;
  isOpen: boolean;
  onClose: () => void;
  onList: (nft: NFTListing, price: number, duration?: number) => Promise<void>;
  marketplaceFee?: number;
}

export function ListNFTModal({ 
  nft, 
  isOpen, 
  onClose, 
  onList, 
  marketplaceFee = 2.5 
}: ListNFTModalProps) {
  const { activeChain } = useMarketplace();
  const currency = activeChain === 'evm' ? 'ETH' : 'SOL';

  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(''); // In days
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPrice('');
      setDuration('');
      setError('');
      setShowAdvanced(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const priceNum = parseFloat(price) || 0;
  const marketplaceFeeAmount = (priceNum * marketplaceFee) / 100;
  const royaltyFee = priceNum * 0.05; // Assume 5% royalty
  const netProceeds = priceNum - marketplaceFeeAmount - royaltyFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!price || priceNum <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (priceNum < 0.01) {
      setError(`Minimum price is 0.01 ${currency}`);
      return;
    }

    if (priceNum > 1000000) {
      setError(`Maximum price is 1,000,000 ${currency}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const durationDays = duration ? parseInt(duration) : undefined;
      await onList(nft, priceNum, durationDays);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list NFT');
    } finally {
      setLoading(false);
    }
  };

  const suggestedPrices = [
    { label: 'Floor Price', value: 0.5, description: 'Current collection floor' },
    { label: 'Average', value: 2.3, description: 'Collection average' },
    { label: 'Above Average', value: 3.5, description: '1.5x average' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl">
        <div className="card p-0">
          {/* Header */}
          <div className="p-6 border-b border-primary-800/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">List NFT for Sale</h2>
                <p className="text-gray-400 mt-1">Set your price and list your NFT on the marketplace</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-dark-300/50 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* NFT Preview */}
          <div className="p-6 border-b border-primary-800/30">
            <div className="flex items-center space-x-4">
              <img
                src={nft.metadata.image}
                alt={nft.metadata.name}
                className="w-20 h-20 rounded-xl object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.pexels.com/photos/4000000/pexels-photo-4000000.jpeg?auto=compress&cs=tinysrgb&w=200';
                }}
              />
              <div>
                <h3 className="text-lg font-semibold text-white">{nft.metadata.name}</h3>
                {nft.metadata.collection && (
                  <p className="text-primary-400 text-sm">{nft.metadata.collection.name}</p>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  {nft.metadata.attributes?.slice(0, 2).map((attr, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary-900/30 text-primary-300 text-xs rounded-lg"
                    >
                      {attr.trait_type}: {attr.value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Price Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max="1000000"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input-primary w-full pr-16 text-lg"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 font-medium">
                  {currency}
                </span>
              </div>
              
              {priceNum > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  ≈ ${(priceNum * 100).toFixed(2)} USD
                </p>
              )}
            </div>

            {/* Suggested Prices */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-300 mb-2">Suggested Prices</p>
              <div className="grid grid-cols-3 gap-2">
                {suggestedPrices.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => setPrice(suggestion.value.toString())}
                    className="p-3 card-hover text-center transition-all"
                  >
                    <p className="text-white font-semibold">{suggestion.value} {currency}</p>
                    <p className="text-primary-400 text-xs">{suggestion.label}</p>
                    <p className="text-gray-400 text-xs">{suggestion.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-primary-400 hover:text-primary-300 transition-colors"
              >
                <Clock className="h-4 w-4" />
                <span className="text-sm">Advanced Options</span>
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 card">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Listing Duration (days)
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="input-primary w-full"
                    >
                      <option value="">No expiration</option>
                      <option value="1">1 day</option>
                      <option value="3">3 days</option>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Your listing will automatically expire after this period
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Fee Breakdown */}
            {priceNum > 0 && (
              <div className="mb-6 p-4 card">
                <div className="flex items-center space-x-2 mb-3">
                  <Calculator className="h-4 w-4 text-primary-400" />
                  <h4 className="text-sm font-medium text-white">Fee Breakdown</h4>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Listing Price</span>
                    <span className="text-white">{priceNum.toFixed(3)} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Marketplace Fee ({marketplaceFee}%)</span>
                    <span className="text-red-400">-{marketplaceFeeAmount.toFixed(3)} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Creator Royalty (5%)</span>
                    <span className="text-red-400">-{royaltyFee.toFixed(3)} {currency}</span>
                  </div>
                  <div className="border-t border-primary-800/30 pt-2 flex justify-between font-semibold">
                    <span className="text-white">You'll receive</span>
                    <span className="text-green-400">{netProceeds.toFixed(3)} {currency}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || !price || priceNum <= 0}
                className="flex-1"
              >
                {loading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Listing...' : 'List NFT'}
              </Button>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-400 text-center mt-4">
              By listing this NFT, you agree to the marketplace terms and conditions.
              The NFT will be transferred to an escrow account until sold.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}