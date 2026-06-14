import React, { useState, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { X, Plus, Trash2, Loader2, Sparkles, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../common/Button';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount, createGenericFileFromBrowserFile } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { ethers } from 'ethers';

interface Attribute {
  trait_type: string;
  value: string;
}

interface MintNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MintNFTModal({ isOpen, onClose, onSuccess }: MintNFTModalProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { activeChain, evmWalletAddress, evmConnected, mintEVMNFT } = useMarketplace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [isDragging, setIsDragging] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isMinting, setIsMinting] = useState(false);
  const [mintStep, setMintStep] = useState<
    'idle' | 'register-metadata' | 'sign-transaction' | 'confirm-chain' | 'success'
  >('idle');

  const DEFAULT_COVER_IMAGE = 'https://images.pexels.com/photos/1910236/pexels-photo-1910236.jpeg?auto=compress&cs=tinysrgb&w=400';

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file for the cover.');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleAddAttribute = () => {
    setAttributes([...attributes, { trait_type: '', value: '' }]);
  };

  const handleRemoveAttribute = (index: number) => {
    const updated = [...attributes];
    updated.splice(index, 1);
    setAttributes(updated);
  };

  const handleAttributeChange = (index: number, field: 'trait_type' | 'value', value: string) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const isMedia = file.type.startsWith('video/') || file.type.startsWith('audio/');
    const sizeLimit = isMedia ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    
    if (file.size > sizeLimit) {
      toast.error(`File size exceeds the ${isMedia ? '20MB' : '5MB'} limit.`);
      return;
    }

    if (file.type.startsWith('image/')) {
      setMediaType('image');
      setImageFile(file);
      setMediaFile(null);
      setMediaPreview('');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
      setMediaFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMediaPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('audio/')) {
      setMediaType('audio');
      setMediaFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMediaPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Unsupported file format. Please upload an image, audio, or video file.');
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview('');
    setMediaFile(null);
    setMediaPreview('');
    setMediaType('image');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeChain === 'solana' && (!wallet.connected || !wallet.publicKey)) {
      toast.error('Please connect your Solana wallet first.');
      return;
    }

    if (activeChain === 'evm' && (!evmConnected || !evmWalletAddress)) {
      toast.error('Please connect your MetaMask wallet first.');
      return;
    }

    if (!name.trim()) {
      toast.error('NFT Name is required.');
      return;
    }

    if (!imagePreview && mediaType === 'image') {
      toast.error('Please select or drop an image file.');
      return;
    }

    if (!mediaPreview && mediaType !== 'image') {
      toast.error('Please select or drop a media file.');
      return;
    }

    // Filter out incomplete attributes and add format attribute if applicable
    const cleanAttributes = [
      ...attributes.filter((attr) => attr.trait_type.trim() && attr.value.trim()),
      ...(mediaFile ? [{ trait_type: 'Format', value: mediaType === 'audio' ? 'Audio' : 'Video' }] : [])
    ];

    setIsMinting(true);
    setMintStep('register-metadata');

    if (activeChain === 'evm') {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const nftAddress = import.meta.env.VITE_EVM_NFT_ADDRESS;
        if (!nftAddress) throw new Error("EVM NFT Address is not configured");

        console.log("Scanning contract to predict next token ID...");
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const nftContract = new ethers.Contract(
          nftAddress, 
          ["function ownerOf(uint256) view returns (address)"], 
          provider
        );
        let nextTokenId = 1;
        while (true) {
          try {
            await nftContract.ownerOf(nextTokenId);
            nextTokenId++;
          } catch (e) {
            break;
          }
        }
        console.log("Next predicted token ID:", nextTokenId);

        const tokenUri = `${apiUrl}/nfts/metadata/${nftAddress.toLowerCase()}-${nextTokenId}`;

        setMintStep('sign-transaction');
        console.log("Prompting wallet to mint NFT on Ethereum Sepolia...");
        const compositeMint = await mintEVMNFT(tokenUri);

        setMintStep('confirm-chain');
        console.log("EVM Mint transaction confirmed. Registering metadata on backend...");

        try {
          const coverData = imagePreview || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%231e1b4b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23818cf8" font-family="sans-serif" font-size="20" font-weight="bold">${encodeURIComponent(name || 'Media NFT')}</text></svg>`;

          await fetch(`${apiUrl}/nfts/metadata`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mint: compositeMint,
              name,
              symbol: symbol.toUpperCase() || 'NFT',
              description,
              imageUrl: '', // dynamically served locally
              attributes: cleanAttributes,
              imageData: coverData,
              animationUrl: '', // dynamically served locally
              animationData: mediaPreview || null,
            }),
          });
        } catch (err) {
          console.warn('⚠️ [EVM Mint] Failed to register metadata on backend:', err);
        }

        setMintStep('success');
        toast.success('NFT minted successfully on Ethereum Sepolia!');

        setTimeout(() => {
          onSuccess?.();
          onClose();
          resetForm();
        }, 1500);
      } catch (error: any) {
        console.error('❌ [EVM Mint] Error minting NFT:', error);
        toast.error(error.message || 'Failed to mint NFT. Please try again.');
        setMintStep('idle');
        setIsMinting(false);
      }
      return;
    }

    try {
      // 1. Initialize Umi
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata())
        .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

      // 2. Generate a keypair for the Mint account
      const mintKeypair = generateSigner(umi);
      const mintAddress = mintKeypair.publicKey.toString();

      console.log(`🚀 [Mint NFT] Generated Mint Keypair: ${mintAddress}`);

      // 3. Upload files to Arweave via Irys uploader
      let imageUri = '';
      if (imageFile) {
        console.log(`🌐 [Mint NFT] Uploading artwork image to Arweave via Irys...`);
        const genericImageFile = await createGenericFileFromBrowserFile(imageFile, {
          contentType: imageFile.type,
        });
        const [uploadedImageUri] = await umi.uploader.upload([genericImageFile]);
        imageUri = uploadedImageUri;
        console.log(`✅ [Mint NFT] Image uploaded successfully. URI: ${imageUri}`);
      } else {
        // Fallback cover for audio/video NFTs
        imageUri = DEFAULT_COVER_IMAGE;
        console.log(`✅ [Mint NFT] Using default cover image: ${imageUri}`);
      }

      let animationUri = '';
      if (mediaFile) {
        console.log(`🌐 [Mint NFT] Uploading media file (${mediaType}) to Arweave via Irys...`);
        const genericMediaFile = await createGenericFileFromBrowserFile(mediaFile, {
          contentType: mediaFile.type,
        });
        const [uploadedMediaUri] = await umi.uploader.upload([genericMediaFile]);
        animationUri = uploadedMediaUri;
        console.log(`✅ [Mint NFT] Media file uploaded successfully. URI: ${animationUri}`);
      }

      // 4. Construct standard Metaplex JSON metadata object
      const metadataObject = {
        name,
        symbol: symbol.toUpperCase() || 'NFT',
        description,
        image: imageUri,
        animation_url: animationUri || undefined,
        attributes: cleanAttributes,
      };

      // 5. Upload JSON metadata to Arweave via Irys uploader
      console.log(`🌐 [Mint NFT] Uploading metadata JSON to Arweave via Irys...`);
      const metadataUri = await umi.uploader.uploadJson(metadataObject);
      console.log(`✅ [Mint NFT] Metadata uploaded successfully. URI: ${metadataUri}`);

      // 6. Register metadata on the local Fastify backend (passive caching/sync)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      console.log(`🌐 [Mint NFT] Registering metadata on backend...`);
      
      try {
        await fetch(`${apiUrl}/nfts/metadata`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mint: mintAddress,
            name,
            symbol: symbol.toUpperCase() || 'NFT',
            description,
            imageUrl: imageUri,
            attributes: cleanAttributes,
            imageData: imagePreview || null,
            animationUrl: animationUri || null,
            animationData: mediaPreview || null
          }),
        });
      } catch (err) {
        console.warn('⚠️ [Mint NFT] Failed to register on Fastify backend, but continuing on-chain mint:', err);
      }

      // 7. Update status to sign
      setMintStep('sign-transaction');

      // 8. Construct Umi CreateNft Transaction
      console.log(`✍️ [Mint NFT] Building on-chain transaction instruction...`);
      const txBuilder = createNft(umi, {
        mint: mintKeypair,
        name,
        symbol: symbol.toUpperCase() || 'NFT',
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(0), // Default 0% royalties
      });

      setMintStep('confirm-chain');
      console.log(`📡 [Mint NFT] Broadcasting mint transaction to Solana Devnet...`);

      // 9. Send and confirm on-chain
      const { signature } = await txBuilder.sendAndConfirm(umi, {
        confirm: { commitment: 'confirmed' },
      });

      console.log(`🎉 [Mint NFT] NFT minted successfully! Tx Signature: ${signature}`);
      
      setMintStep('success');
      toast.success('NFT minted successfully!');
      
      // Auto success close
      setTimeout(() => {
        onSuccess?.();
        onClose();
        resetForm();
      }, 1500);

    } catch (error: any) {
      console.error('❌ [Mint NFT] Error minting NFT:', error);
      toast.error(error.message || 'Failed to mint NFT. Please try again.');
      setMintStep('idle');
      setIsMinting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSymbol('');
    setDescription('');
    setImageFile(null);
    setImagePreview('');
    setMediaFile(null);
    setMediaPreview('');
    setMediaType('image');
    setAttributes([]);
    setIsMinting(false);
    setMintStep('idle');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto relative animate-scale-in border border-primary-800/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-800/30">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary-400" />
            <h2 className="text-xl font-bold text-white">Mint Your Custom NFT</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-300/50 text-gray-400 hover:text-white transition-colors"
            disabled={isMinting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading overlay */}
        {isMinting && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="h-16 w-16 text-primary-500 animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {mintStep === 'register-metadata' && (activeChain === 'evm' ? 'Preparing NFT Metadata...' : 'Uploading image & registering metadata...')}
              {mintStep === 'sign-transaction' && 'Check wallet for approval...'}
              {mintStep === 'confirm-chain' && (activeChain === 'evm' ? 'Registering NFT on backend...' : 'Waiting for block confirmation...')}
              {mintStep === 'success' && 'NFT Minted Successfully!'}
            </h3>
            <p className="text-gray-400 max-w-sm">
              {mintStep === 'register-metadata' && (activeChain === 'evm' ? 'Predicting next token ID and preparing metadata URI...' : 'Uploading artwork and saving configuration to database...')}
              {mintStep === 'sign-transaction' && (activeChain === 'evm' ? 'Please approve the transaction to mint your NFT on Ethereum Sepolia.' : 'Please approve the minting transaction inside your wallet.')}
              {mintStep === 'confirm-chain' && (activeChain === 'evm' ? 'Registering minted NFT metadata and uploading assets to IPFS/database.' : 'Confirming SPL Token creation and Metaplex metadata on Solana Devnet.')}
              {mintStep === 'success' && 'Updating your portfolio dashboard.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Form fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="nft-name" className="block text-sm font-medium text-gray-300 mb-1">
                NFT Name <span className="text-red-500">*</span>
              </label>
              <input
                id="nft-name"
                type="text"
                placeholder="e.g. Cyber Cosmic Voyager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-primary w-full"
                required
                maxLength={32}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nft-symbol" className="block text-sm font-medium text-gray-300 mb-1">
                  Symbol <span className="text-gray-500">(default: NFT)</span>
                </label>
                <input
                  id="nft-symbol"
                  type="text"
                  placeholder="e.g. CCV"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="input-primary w-full"
                  maxLength={10}
                />
              </div>

              <div>
                <label htmlFor="nft-royalty" className="block text-sm font-medium text-gray-300 mb-1">
                  Royalties <span className="text-gray-500">(Creator Fee)</span>
                </label>
                <input
                  id="nft-royalty"
                  type="text"
                  value="0% (Standard)"
                  className="input-primary w-full opacity-60 cursor-not-allowed"
                  disabled
                />
              </div>
            </div>

            <div>
              <label htmlFor="nft-description" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="nft-description"
                placeholder="Describe the story, traits, or utility of this NFT..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-primary w-full h-24 resize-none"
                maxLength={500}
              />
            </div>

            {/* Drag & Drop File Upload Container */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                NFT Media File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*,audio/*"
                className="hidden"
              />
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 relative group flex flex-col items-center justify-center min-h-[140px] ${
                  isDragging
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-primary-800/30 hover:border-primary-500/50 hover:bg-dark-300/30'
                }`}
              >
                {mediaPreview || imagePreview ? (
                  <div className="flex items-center space-x-4 w-full">
                    {mediaType === 'image' && imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Thumbnail"
                        className="w-16 h-16 object-cover rounded-lg border border-primary-800/30"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary-600/10 border border-primary-800/30 flex items-center justify-center text-primary-400 text-xs font-bold capitalize">
                        {mediaType}
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {mediaFile?.name || imageFile?.name || 'Uploaded File'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {mediaFile 
                          ? `${(mediaFile.size / (1024 * 1024)).toFixed(2)} MB` 
                          : imageFile 
                            ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB` 
                            : 'Custom File'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-dark-300/50 transition-colors"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-primary-400 mb-2 group-hover:scale-110 transition-transform duration-200" />
                    <p className="text-sm font-medium text-white mb-1">
                      Drag & drop your file here, or <span className="text-primary-400">browse</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Images, Audio (MP3/WAV), or Video (MP4/WebM) up to 20MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Cover Image Upload (Only shown for audio/video) */}
            {mediaType !== 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cover Artwork Image <span className="text-gray-500">(recommended)</span>
                </label>
                <input
                  type="file"
                  id="cover-image-input"
                  onChange={handleCoverFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('cover-image-input')?.click();
                  }}
                  className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 border-primary-800/30 hover:border-primary-500/50 hover:bg-dark-300/30 flex items-center justify-center min-h-[90px]"
                >
                  {imagePreview ? (
                    <div className="flex items-center space-x-4 w-full">
                      <img
                        src={imagePreview}
                        alt="Cover Preview"
                        className="w-12 h-12 object-cover rounded-lg border border-primary-800/30"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {imageFile?.name || 'Cover Artwork'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Click to upload a cover image (PNG, JPG, WebP)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Attributes Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Attributes / Traits</label>
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="flex items-center space-x-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Attribute</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {attributes.map((attr, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Type (e.g. Background)"
                      value={attr.trait_type}
                      onChange={(e) => handleAttributeChange(idx, 'trait_type', e.target.value)}
                      className="input-primary w-1/2 text-sm py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Neon Blue)"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)}
                      className="input-primary w-1/2 text-sm py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttribute(idx)}
                      className="p-2 text-red-500 hover:text-red-400 hover:bg-dark-300/50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {attributes.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2 border border-dashed border-primary-800/20 rounded-lg">
                    No custom traits added.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Preview Panel */}
          <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-primary-800/30 pt-6 md:pt-0 md:pl-8">
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Live NFT Preview</h3>
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-dark-400 border border-primary-800/30 flex flex-col items-center justify-center p-4 relative group shadow-inner">
                {mediaPreview ? (
                  mediaType === 'video' ? (
                    <video
                      src={mediaPreview}
                      controls={false}
                      autoPlay
                      muted
                      loop
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    // Audio visual preview
                    <div className="flex flex-col items-center justify-center w-full h-full bg-primary-600/5 rounded-lg p-6 border border-primary-800/20 text-center">
                      <div className="p-4 bg-primary-600/10 rounded-full mb-3 text-primary-400 animate-pulse">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-white truncate max-w-[200px]">{mediaFile?.name}</p>
                      <p className="text-xs text-gray-400 mt-1">Audio Track (Ready to Mint)</p>
                      {imagePreview && (
                        <div className="mt-4 flex items-center space-x-2 bg-dark-300/40 p-1.5 rounded-lg border border-primary-800/20">
                          <img src={imagePreview} className="w-8 h-8 object-cover rounded" />
                          <span className="text-xs text-gray-300">Cover Attached</span>
                        </div>
                      )}
                    </div>
                  )
                ) : imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="NFT Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    <p className="text-sm">Select or drag an artwork file to see your preview here</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
                <p className="text-xs text-primary-400 font-medium">
                  {activeChain === 'evm' ? (
                    '💡 testnet note: You will require a small amount of Sepolia ETH to pay transaction fees.'
                  ) : (
                    '💡 devnet note: You will require a small amount of SOL on Solana Devnet to pay transaction fees (~0.02 SOL for token creation and Metaplex rental fees).'
                  )}
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={onClose}
                  type="button"
                  disabled={isMinting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  type="submit"
                  disabled={isMinting}
                >
                  Mint NFT
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
