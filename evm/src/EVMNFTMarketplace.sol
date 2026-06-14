// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EVMNFTMarketplace is IERC721Receiver, ReentrancyGuard {
    struct Listing {
        address maker;
        address nftContract;
        uint256 tokenId;
        uint256 price; // in Wei (ETH)
        bool active;
    }

    string public name;
    address public authority;
    address payable public treasury;
    uint16 public feeBps; // e.g. 250 for 2.5%

    // mapping from nftContract => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // Events matching Solana program's events
    event NFTListed(
        address indexed nftMint, // matches nft_mint in Solana indexer
        address indexed marketplace,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );

    event NFTPurchased(
        address indexed nftMint, // matches nft_mint in Solana indexer
        address indexed marketplace,
        address indexed seller,
        address buyer,
        uint256 price,
        uint256 timestamp
    );

    event NFTDelisted(
        address indexed nftMint, // matches nft_mint in Solana indexer
        address indexed marketplace,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );

    event FeeUpdated(
        address indexed marketplace,
        address indexed admin,
        uint16 oldFee,
        uint16 newFee,
        uint256 timestamp
    );

    modifier onlyAuthority() {
        require(msg.sender == authority, "Not authorized");
        _;
    }

    constructor(string memory _name, uint16 _feeBps, address payable _treasury) {
        require(_feeBps <= 10000, "Fee too high");
        name = _name;
        authority = msg.sender;
        feeBps = _feeBps;
        treasury = _treasury;
    }

    function listNft(address nftContract, uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be positive");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not token owner");
        
        // Transfer the NFT to this contract (escrow/vault style)
        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        listings[nftContract][tokenId] = Listing({
            maker: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit NFTListed(nftContract, address(this), msg.sender, price, block.timestamp);
    }

    function purchaseNft(address nftContract, uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.active, "Listing not active");
        require(msg.value == listing.price, "Incorrect payment amount");

        listing.active = false;

        uint256 fee = (listing.price * feeBps) / 10000;
        uint256 payout = listing.price - fee;

        // Pay the seller
        (bool successSeller, ) = payable(listing.maker).call{value: payout}("");
        require(successSeller, "Transfer to seller failed");

        // Pay the treasury
        if (fee > 0) {
            (bool successTreasury, ) = treasury.call{value: fee}("");
            require(successTreasury, "Transfer to treasury failed");
        }

        // Transfer NFT to the buyer
        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, tokenId);

        emit NFTPurchased(nftContract, address(this), listing.maker, msg.sender, listing.price, block.timestamp);
    }

    function delistNft(address nftContract, uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.active, "Listing not active");
        require(msg.sender == listing.maker || msg.sender == authority, "Not owner or admin");

        listing.active = false;

        // Return NFT to the maker
        IERC721(nftContract).safeTransferFrom(address(this), listing.maker, tokenId);

        emit NFTDelisted(nftContract, address(this), listing.maker, listing.price, block.timestamp);
    }

    function updateFee(uint16 newFee) external onlyAuthority {
        require(newFee <= 10000, "Fee too high");
        uint16 oldFee = feeBps;
        feeBps = newFee;

        emit FeeUpdated(address(this), msg.sender, oldFee, newFee, block.timestamp);
    }

    // Required to receive ERC721 tokens via safeTransferFrom
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
