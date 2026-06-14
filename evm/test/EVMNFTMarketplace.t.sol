// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {EVMNFTMarketplace} from "../src/EVMNFTMarketplace.sol";
import {MockERC721} from "../src/MockERC721.sol";

contract EVMNFTMarketplaceTest is Test {
    EVMNFTMarketplace public marketplace;
    MockERC721 public nft;

    address payable public treasury = payable(makeAddr("treasury"));
    address public admin = makeAddr("admin");
    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");

    function setUp() public {
        // Deploy marketplace with admin as deployer
        vm.startPrank(admin);
        marketplace = new EVMNFTMarketplace("Nexus EVM Test Marketplace", 250, treasury); // 2.5% fee
        vm.stopPrank();

        // Deploy MockERC721
        nft = new MockERC721();
    }

    function test_Initialize() public view {
        assertEq(marketplace.name(), "Nexus EVM Test Marketplace");
        assertEq(marketplace.feeBps(), 250);
        assertEq(marketplace.authority(), admin);
        assertEq(marketplace.treasury(), treasury);
    }

    function test_ListNFT() public {
        // Mint NFT to seller
        string memory tokenURI = "https://gateway.irys.xyz/metadata";
        uint256 tokenId = nft.mint(seller, tokenURI);

        assertEq(nft.ownerOf(tokenId), seller);

        vm.startPrank(seller);
        // Approve marketplace to transfer NFT
        nft.approve(address(marketplace), tokenId);

        // List NFT
        uint256 price = 1 ether;
        vm.expectEmit(true, true, true, true, address(marketplace));
        emit EVMNFTMarketplace.NFTListed(address(nft), address(marketplace), seller, price, block.timestamp);
        marketplace.listNft(address(nft), tokenId, price);
        vm.stopPrank();

        // Verify escrow
        assertEq(nft.ownerOf(tokenId), address(marketplace));

        // Verify listing details
        (address maker, address nftContract, uint256 listTokenId, uint256 listPrice, bool active) = marketplace.listings(address(nft), tokenId);
        assertEq(maker, seller);
        assertEq(nftContract, address(nft));
        assertEq(listTokenId, tokenId);
        assertEq(listPrice, price);
        assertTrue(active);
    }

    function test_PurchaseNFT() public {
        // Mint, approve, list
        uint256 tokenId = nft.mint(seller, "uri");
        vm.startPrank(seller);
        nft.approve(address(marketplace), tokenId);
        uint256 price = 1 ether;
        marketplace.listNft(address(nft), tokenId, price);
        vm.stopPrank();

        // Deal 1 ether to buyer
        vm.deal(buyer, 1 ether);

        // Record balances before purchase
        uint256 sellerBalanceBefore = seller.balance;
        uint256 treasuryBalanceBefore = treasury.balance;

        vm.startPrank(buyer);
        vm.expectEmit(true, true, true, true, address(marketplace));
        emit EVMNFTMarketplace.NFTPurchased(address(nft), address(marketplace), seller, buyer, price, block.timestamp);
        marketplace.purchaseNft{value: price}(address(nft), tokenId);
        vm.stopPrank();

        // Verify buyer received the NFT
        assertEq(nft.ownerOf(tokenId), buyer);

        // Verify listing is inactive
        (,,,, bool active) = marketplace.listings(address(nft), tokenId);
        assertFalse(active);

        // Verify payouts
        // Fee = 2.5% of 1 ether = 0.025 ether
        // Seller gets = 1 ether - 0.025 ether = 0.975 ether
        uint256 expectedFee = (price * 250) / 10000;
        uint256 expectedPayout = price - expectedFee;

        assertEq(seller.balance - sellerBalanceBefore, expectedPayout);
        assertEq(treasury.balance - treasuryBalanceBefore, expectedFee);
    }

    function test_DelistNFT() public {
        // Mint, approve, list
        uint256 tokenId = nft.mint(seller, "uri");
        vm.startPrank(seller);
        nft.approve(address(marketplace), tokenId);
        uint256 price = 1 ether;
        marketplace.listNft(address(nft), tokenId, price);
        vm.stopPrank();

        // Delist
        vm.startPrank(seller);
        vm.expectEmit(true, true, true, true, address(marketplace));
        emit EVMNFTMarketplace.NFTDelisted(address(nft), address(marketplace), seller, price, block.timestamp);
        marketplace.delistNft(address(nft), tokenId);
        vm.stopPrank();

        // Verify seller received NFT back
        assertEq(nft.ownerOf(tokenId), seller);

        // Verify listing is inactive
        (,,,, bool active) = marketplace.listings(address(nft), tokenId);
        assertFalse(active);
    }

    function test_UpdateFee() public {
        vm.startPrank(admin);
        vm.expectEmit(true, true, true, true, address(marketplace));
        emit EVMNFTMarketplace.FeeUpdated(address(marketplace), admin, 250, 500, block.timestamp);
        marketplace.updateFee(500); // 5%
        vm.stopPrank();

        assertEq(marketplace.feeBps(), 500);
    }

    function test_Fail_UpdateFee_NotAdmin() public {
        vm.startPrank(seller);
        vm.expectRevert("Not authorized");
        marketplace.updateFee(500);
        vm.stopPrank();
    }
}
