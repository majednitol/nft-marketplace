import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Menu, Search, Bell } from 'lucide-react';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { CompactThemeToggle } from '../theme/ThemeToggle';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { publicKey, connected, connecting, disconnecting } = useWallet();
  const { 
    activeChain, 
    setActiveChain, 
    evmWalletAddress, 
    evmConnected, 
    connectEVMWallet, 
    disconnectEVMWallet, 
    stats, 
    error: marketplaceError, 
    loading 
  } = useMarketplace();
  const [searchQuery, setSearchQuery] = useState('');

  // Show connection status
  const getConnectionStatus = () => {
    if (connecting) return 'Connecting...';
    if (disconnecting) return 'Disconnecting...';
    if (connected && publicKey) return `Connected: ${publicKey.toBase58().slice(0, 8)}...`;
    return 'Not Connected';
  };

  const handleChainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveChain(e.target.value as 'solana' | 'evm');
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-primary-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-dark-300/50 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-300" />
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center animate-pulse-glow">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <h1 className="text-xl font-bold text-gradient">
                NFT Nexus
              </h1>
            </div>
          </div>

          {/* Center search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search NFTs, collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-primary w-full pl-10"
              />
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="hidden md:flex items-center space-x-3 text-sm">
              <div className={`px-3 py-1 rounded-lg border ${
                (activeChain === 'evm' ? evmConnected : connected) 
                  ? 'bg-green-900/30 border-green-500/30 text-green-400' 
                  : (activeChain === 'solana' && connecting) 
                    ? 'bg-yellow-900/30 border-yellow-500/30 text-yellow-400'
                    : 'bg-red-900/30 border-red-500/30 text-red-400'
              }`}>
                <span className="text-xs">{
                  activeChain === 'evm'
                    ? (evmConnected && evmWalletAddress ? `Connected: ${evmWalletAddress.slice(0, 6)}...${evmWalletAddress.slice(-4)}` : 'Not Connected')
                    : getConnectionStatus()
                }</span>
              </div>
              
              {(activeChain === 'evm' ? evmConnected : connected) && stats && !loading && (
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="px-3 py-1 bg-dark-400/50 rounded-lg border border-primary-800/30">
                    <span className="text-primary-400">Volume:</span> {stats.totalVolume.toFixed(1)} {activeChain === 'evm' ? 'ETH' : 'SOL'}
                  </div>
                  <div className="px-3 py-1 bg-dark-400/50 rounded-lg border border-primary-800/30">
                    <span className="text-primary-400">Floor:</span> {stats.floorPrice} {activeChain === 'evm' ? 'ETH' : 'SOL'}
                  </div>
                </div>
              )}
              
              {marketplaceError && (
                <div className="px-2 py-1 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs">
                  Error loading data
                </div>
              )}
            </div>

            {(activeChain === 'evm' ? evmConnected : connected) && (
              <button className="p-2 rounded-lg hover:bg-dark-300/50 transition-colors relative">
                <Bell className="h-5 w-5 text-gray-300" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-pink rounded-full animate-pulse"></span>
              </button>
            )}

            {/* Network Selector */}
            <select
              value={activeChain}
              onChange={handleChainChange}
              className="bg-dark-450 border border-primary-800/30 rounded-xl text-sm font-medium px-3 py-1.5 text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer bg-dark-300"
            >
              <option value="solana">Solana Devnet</option>
              <option value="evm">Ethereum Sepolia</option>
            </select>

            <CompactThemeToggle />

            {activeChain === 'evm' ? (
              evmConnected && evmWalletAddress ? (
                <button
                  onClick={disconnectEVMWallet}
                  className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl text-sm font-medium px-4 py-2 hover:from-orange-700 hover:to-orange-800 transition-all text-white shadow-lg hover:shadow-orange-500/30"
                >
                  Disconnect ({evmWalletAddress.slice(0, 6)}...{evmWalletAddress.slice(-4)})
                </button>
              ) : (
                <button
                  onClick={connectEVMWallet}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-sm font-medium px-4 py-2 hover:from-orange-600 hover:to-orange-700 transition-all text-white shadow-lg hover:shadow-orange-500/30"
                >
                  Connect MetaMask
                </button>
              )
            ) : (
              <WalletMultiButton className="!bg-gradient-to-r !from-primary-600 !to-primary-700 !rounded-xl !text-sm !font-medium !px-4 !py-2 hover:!from-primary-700 hover:!to-primary-800 transition-all !border-0 !shadow-lg hover:!shadow-primary-500/30" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}