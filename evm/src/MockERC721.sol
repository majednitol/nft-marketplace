// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MockERC721 is ERC721URIStorage {
    uint256 private _nextTokenId;

    constructor() ERC721("Nexus Custom NFT", "NEXUS") {}

    function mint(address to, string memory tokenURI) public returns (uint256) {
        _nextTokenId++;
        uint256 newItemId = _nextTokenId;
        _safeMint(to, newItemId);
        _setTokenURI(newItemId, tokenURI);
        return newItemId;
    }
}
