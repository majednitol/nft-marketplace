// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {EVMNFTMarketplace} from "../src/EVMNFTMarketplace.sol";

contract DeployMarketplaceScript is Script {
    function run() external returns (EVMNFTMarketplace) {
        uint256 deployerPrivateKey = vm.envOr(
            "EVM_PRIVATE_KEY",
            uint256(0xd56a8b6b3b47b74df2b4ae8a80faeafc4c56efd16ab106096be835ca86e30f6d)
        );
        
        vm.startBroadcast(deployerPrivateKey);

        EVMNFTMarketplace marketplace = new EVMNFTMarketplace(
            "Nexus EVM Marketplace",
            250,
            payable(0xe1f1a5093254b350C55514f8b9DBb40b996170C0)
        );

        vm.stopBroadcast();
        return marketplace;
    }
}
