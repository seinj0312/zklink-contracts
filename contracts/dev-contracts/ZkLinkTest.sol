// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.7.0;

pragma experimental ABIEncoderV2;

import "../ZkLink.sol";

contract ZkLinkTest is ZkLink {

    function setExodus(bool _exodusMode) external {
        exodusMode = _exodusMode;
    }

    function setTotalOpenPriorityRequests(uint64 _totalOpenPriorityRequests) external {
        totalOpenPriorityRequests = _totalOpenPriorityRequests;
    }

    function setPriorityExpirationBlock(uint64 index, uint64 eb) external {
        priorityRequests[index].expirationBlock = eb;
    }

    function getPriorityHash(uint64 index) external view returns (bytes20) {
        return priorityRequests[index].hashedPubData;
    }

    function getPubdataHash(uint64 index) external view returns (bytes20) {
        return priorityRequests[index].hashedPubData;
    }

    function testRegisterDeposit(
        uint16 _tokenId,
        uint128 _amount,
        address _owner) external {
//        registerDeposit(_tokenId, _amount, _owner);
    }

    function getStoredBlockHashes(uint32 height) external view returns (bytes32) {
        return storedBlockHashes[height];
    }
}
