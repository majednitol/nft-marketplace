import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { fetchUserNFTs } from '../../utils/userNFTs';
import { Search, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function NFTDiscoveryStatus() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{
    totalAccounts: number;
    potentialNFTs: number;
    validNFTs: number;
    nftNames: string[];
  } | null>(null);

  const scanForNFTs = async () => {
    if (!publicKey || !connection) return;

    setIsScanning(true);
    setScanResults(null);

    try {
      // Capture console logs during scan
      const originalLog = console.log;
      let logMessages: string[] = [];
      
      console.log = (...args) => {
        const message = args.join(' ');
        if (message.includes('[NFT Discovery]')) {
          logMessages.push(message);
        }
        originalLog(...args);
      };

      const nfts = await fetchUserNFTs(connection, publicKey);
      
      // Restore console.log
      console.log = originalLog;

      // Parse results from logs
      const totalAccountsMatch = logMessages.find(msg => msg.includes('total token accounts'));
      const potentialNFTsMatch = logMessages.find(msg => msg.includes('potential NFTs'));
      
      setScanResults({
        totalAccounts: totalAccountsMatch ? parseInt(totalAccountsMatch.match(/\d+/)?.[0] || '0') : 0,
        potentialNFTs: potentialNFTsMatch ? parseInt(potentialNFTsMatch.match(/\d+/)?.[0] || '0') : 0,
        validNFTs: nfts.length,
        nftNames: nfts.map(nft => nft.metadata.name)
      });

    } catch (error) {
      console.error('Error scanning for NFTs:', error);
    } finally {
      setIsScanning(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="card p-4 bg-dark-400/50 border border-gray-600/30">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
          <span className="text-yellow-400">Connect wallet to scan for NFTs</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Search className="h-5 w-5" />
          <span>NFT Discovery</span>
        </h3>
        <button
          onClick={scanForNFTs}
          disabled={isScanning}
          className="btn-secondary flex items-center space-x-2"
        >
          {isScanning ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Scan Wallet</span>
            </>
          )}
        </button>
      </div>

      <div className="text-sm text-gray-400 mb-4">
        Wallet: <span className="text-primary-400 font-mono">{publicKey.toBase58()}</span>
      </div>

      {scanResults && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 p-4 bg-dark-400/30 rounded-lg">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{scanResults.totalAccounts}</div>
              <div className="text-xs text-gray-400">Token Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-400">{scanResults.potentialNFTs}</div>
              <div className="text-xs text-gray-400">Potential NFTs</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{scanResults.validNFTs}</div>
              <div className="text-xs text-gray-400">Valid NFTs</div>
            </div>
          </div>

          {scanResults.validNFTs > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">NFTs Found:</span>
              </div>
              <div className="space-y-1">
                {scanResults.nftNames.map((name, index) => (
                  <div key={index} className="text-sm text-gray-300 pl-6">
                    {index + 1}. {name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              <span>No NFTs found in wallet</span>
            </div>
          )}
        </div>
      )}

      {!scanResults && !isScanning && (
        <div className="text-gray-400 text-sm">
          Click "Scan Wallet" to check for NFTs in your connected wallet.
        </div>
      )}
    </div>
  );
}