import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const MARKETPLACE_ABI = [
  "function name() view returns (string)",
  "function feeBps() view returns (uint16)",
  "function authority() view returns (address)",
  "function treasury() view returns (address)",
  "function listings(address, uint256) view returns (address maker, address nftContract, uint256 tokenId, uint256 price, bool active)",
  "function listNft(address nftContract, uint256 tokenId, uint256 price)",
  "function purchaseNft(address nftContract, uint256 tokenId) payable",
  "function delistNft(address nftContract, uint256 tokenId)",
  "function updateFee(uint16 newFee)"
];

const ERC721_ABI = [
  "function mint(address to, string memory tokenURI) returns (uint256)",
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

export function useEVMProgram() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const getProvider = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return new ethers.BrowserProvider((window as any).ethereum);
    }
    return null;
  }, []);

  const checkNetwork = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    const provider = getProvider();
    if (!provider) return;
    const network = await provider.getNetwork();
    const targetChainId = "11155111"; // Sepolia
    if (network.chainId.toString() !== targetChainId) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + Number(targetChainId).toString(16) }],
        });
      } catch (err: any) {
        if (err.code === 4902) {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + Number(targetChainId).toString(16),
              chainName: 'Sepolia Test Network',
              nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/BFjTtbanxS5n2OC708mYTHPpIsk4zzot'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        } else {
          throw err;
        }
      }
    }
  }, [getProvider]);

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error("MetaMask is not installed");
    }
    await checkNetwork();
    const provider = getProvider();
    if (!provider) return null;
    const accounts = await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();
    setWalletAddress(accounts[0]);
    setChainId(network.chainId.toString());
    setIsConnected(true);
    return accounts[0];
  }, [getProvider, checkNetwork]);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const provider = getProvider();
      if (!provider) return;
      provider.send("eth_accounts", []).then(async (accounts) => {
        if (accounts.length > 0) {
          const network = await provider.getNetwork();
          setWalletAddress(accounts[0]);
          setChainId(network.chainId.toString());
          setIsConnected(true);
        }
      }).catch(err => console.debug('Failed to get eth accounts automatically:', err));

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        } else {
          setWalletAddress(null);
          setIsConnected(false);
        }
      };

      const handleChainChanged = (newChainId: string) => {
        setChainId(parseInt(newChainId, 16).toString());
      };

      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if ((window as any).ethereum.removeListener) {
          (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
          (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [getProvider]);

  const getMarketplaceContract = useCallback(async () => {
    await checkNetwork();
    const provider = getProvider();
    if (!provider) throw new Error("No EVM provider");
    const signer = await provider.getSigner();
    const address = import.meta.env.VITE_EVM_MARKETPLACE_ADDRESS;
    if (!address) throw new Error("EVM marketplace address is not defined");
    return new ethers.Contract(address, MARKETPLACE_ABI, signer);
  }, [getProvider, checkNetwork]);

  const getNFTContract = useCallback(async (tokenAddress: string) => {
    const provider = getProvider();
    if (!provider) throw new Error("No EVM provider");
    const signer = await provider.getSigner();
    return new ethers.Contract(tokenAddress, ERC721_ABI, signer);
  }, [getProvider]);

  const mintNFT = useCallback(async (tokenUri: string): Promise<string> => {
    await checkNetwork();
    const provider = getProvider();
    if (!provider) throw new Error("No EVM provider");
    const signer = await provider.getSigner();
    const nftAddress = import.meta.env.VITE_EVM_NFT_ADDRESS;
    if (!nftAddress) throw new Error("EVM NFT address is not defined");
    const nftContract = new ethers.Contract(nftAddress, ERC721_ABI, signer);

    const tx = await nftContract.mint(await signer.getAddress(), tokenUri);
    const receipt = await tx.wait();

    let tokenId = "1";
    for (const log of receipt.logs) {
      try {
        const parsedLog = nftContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        if (parsedLog && parsedLog.name === "Transfer") {
          tokenId = parsedLog.args.tokenId.toString();
          break;
        }
      } catch (e) {
        // Skip log if it is not from this contract
      }
    }
    return `${nftAddress.toLowerCase()}-${tokenId}`;
  }, [getProvider, checkNetwork]);

  const listNFT = useCallback(async (compositeMint: string, priceInEth: number): Promise<string> => {
    const parts = compositeMint.split('-');
    const nftContractAddress = parts[0];
    const tokenId = parts[1];

    const marketplace = await getMarketplaceContract();
    const nftContract = await getNFTContract(nftContractAddress);

    // 1. Approve marketplace to spend NFT if not approved
    const operator = await marketplace.getAddress();
    const isApproved = await nftContract.isApprovedForAll(walletAddress, operator);
    if (!isApproved) {
      const approveTx = await nftContract.setApprovalForAll(operator, true);
      await approveTx.wait();
    }

    // 2. Call listNft on marketplace
    const priceInWei = ethers.parseEther(priceInEth.toString());
    const listTx = await marketplace.listNft(nftContractAddress, tokenId, priceInWei);
    const receipt = await listTx.wait();
    return receipt.hash;
  }, [walletAddress, getMarketplaceContract, getNFTContract]);

  const purchaseNFT = useCallback(async (compositeMint: string, priceInEth: number): Promise<string> => {
    const parts = compositeMint.split('-');
    const nftContractAddress = parts[0];
    const tokenId = parts[1];

    const marketplace = await getMarketplaceContract();
    const priceInWei = ethers.parseEther(priceInEth.toString());

    const tx = await marketplace.purchaseNft(nftContractAddress, tokenId, {
      value: priceInWei
    });
    const receipt = await tx.wait();
    return receipt.hash;
  }, [getMarketplaceContract]);

  const delistNFT = useCallback(async (compositeMint: string): Promise<string> => {
    const parts = compositeMint.split('-');
    const nftContractAddress = parts[0];
    const tokenId = parts[1];

    const marketplace = await getMarketplaceContract();
    const tx = await marketplace.delistNft(nftContractAddress, tokenId);
    const receipt = await tx.wait();
    return receipt.hash;
  }, [getMarketplaceContract]);

  const updateFee = useCallback(async (newFeeBps: number): Promise<string> => {
    const marketplace = await getMarketplaceContract();
    const tx = await marketplace.updateFee(newFeeBps);
    const receipt = await tx.wait();
    return receipt.hash;
  }, [getMarketplaceContract]);

  return {
    walletAddress,
    chainId,
    isConnected,
    connectWallet,
    disconnectWallet,
    mintNFT,
    listNFT,
    purchaseNFT,
    delistNFT,
    updateFee
  };
}
