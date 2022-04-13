// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.7.0;

pragma experimental ABIEncoderV2;

import "./zksync/Bytes.sol";
import "./zksync/Utils.sol";
import "./zksync/ReentrancyGuard.sol";
import "./zksync/Config.sol";
import "./zksync/SafeMath.sol";
import "./IZkLink.sol";

contract ZkLinkPeriphery is ReentrancyGuard, Config {
    using SafeMath for uint256;

    /// @dev When set fee = 100, it means 1%
    uint16 constant MAX_WITHDRAW_FEE_RATE = 10000;

    IZkLink public zkLink;

    /// @dev Accept infos of fast withdraw
    /// Key is keccak256(abi.encodePacked(receiver, tokenId, amount, withdrawFee, nonce))
    /// Value is the accepter address
    mapping(bytes32 => address) public accepts;

    /// @dev Broker allowance used in accept
    mapping(uint16 => mapping(address => mapping(address => uint128))) internal brokerAllowances;

    enum ChangePubkeyType {ECRECOVER, CREATE2}

    /// @notice Event emitted when accepter accept a fast withdraw
    event Accept(address indexed accepter, address indexed receiver, uint16 indexed tokenId, uint128 amount);

    modifier onlyZkLink {
        require(msg.sender == address(zkLink), "ZkLink: no auth");
        _;
    }

    function initialize(bytes calldata /**initializationParameters**/) external {
        initializeReentrancyGuard();
    }

    /// @notice Verifier contract upgrade. Can be external because Proxy contract intercepts illegal calls of this function.
    /// @param upgradeParameters Encoded representation of upgrade parameters
    function upgrade(bytes calldata upgradeParameters) external {}

    function setZkLinkAddress(address _zkLink) external {
        if (_zkLink == address(0)) {
            zkLink = IZkLink(_zkLink);
        }
    }

    function getAccepter(bytes32 hash) external view returns (address) {
        return accepts[hash];
    }

    function setAccepter(bytes32 hash, address accepter) external onlyZkLink {
        accepts[hash] = accepter;
    }

    /// @notice Checks that change operation is correct
    function verifyChangePubkey(bytes memory _ethWitness,
        uint32 _accountId,
        bytes20 _pubKeyHash,
        address _owner,
        uint32 _nonce) external pure returns (bool)
    {
        ChangePubkeyType changePkType = ChangePubkeyType(uint8(_ethWitness[0]));
        if (changePkType == ChangePubkeyType.ECRECOVER) {
            return verifyChangePubkeyECRECOVER(_ethWitness, _accountId, _pubKeyHash, _owner, _nonce);
        } else if (changePkType == ChangePubkeyType.CREATE2) {
            return verifyChangePubkeyCREATE2(_ethWitness, _pubKeyHash, _owner, _nonce);
        } else {
            revert("ZkLink: incorrect changePkType");
        }
    }

    /// @notice Checks that signature is valid for pubkey change message
    function verifyChangePubkeyECRECOVER(bytes memory _ethWitness,
        uint32 _accountId,
        bytes20 _pubKeyHash,
        address _owner,
        uint32 _nonce) internal pure returns (bool)
    {
        (, bytes memory signature) = Bytes.read(_ethWitness, 1, 65); // offset is 1 because we skip type of ChangePubkey
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n60", // message len(60) = _pubKeyHash.len(20) + _nonce.len(4) + _accountId.len(4) + 32
                _pubKeyHash,
                _nonce,
                _accountId,
                bytes32(0)
            )
        );
        address recoveredAddress = Utils.recoverAddressFromEthSignature(signature, messageHash);
        return recoveredAddress == _owner;
    }

    /// @notice Checks that signature is valid for pubkey change message
    function verifyChangePubkeyCREATE2(bytes memory _ethWitness,
        bytes20 _pubKeyHash,
        address _owner,
        uint32 _nonce) internal pure returns (bool)
    {
        address creatorAddress;
        bytes32 saltArg; // salt arg is additional bytes that are encoded in the CREATE2 salt
        bytes32 codeHash;
        uint256 offset = 1; // offset is 1 because we skip type of ChangePubkey
        (offset, creatorAddress) = Bytes.readAddress(_ethWitness, offset);
        (offset, saltArg) = Bytes.readBytes32(_ethWitness, offset);
        (offset, codeHash) = Bytes.readBytes32(_ethWitness, offset);
        // salt from CREATE2 specification
        bytes32 salt = keccak256(abi.encodePacked(saltArg, _pubKeyHash));
        // Address computation according to CREATE2 definition: https://eips.ethereum.org/EIPS/eip-1014
        address recoveredAddress = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), creatorAddress, salt, codeHash))))
        );
        // This type of change pubkey can be done only once
        return recoveredAddress == _owner && _nonce == 0;
    }

    /// @dev Creates block commitment from its data
    /// @dev _offsetCommitment - hash of the array where 1 is stored in chunk where onchainOperation begins and 0 for other chunks
    function createBlockCommitment(
        bytes32 _previousStateHash,
        uint32 _newBlockNumber,
        uint32 _newFeeAccount,
        bytes32 _newStateHash,
        uint256 _newTimestamp,
        bytes memory _newPublicData,
        bytes memory _offsetCommitment
    ) external view returns (bytes32 commitment) {
        bytes32 hash = sha256(abi.encodePacked(uint256(_newBlockNumber), uint256(_newFeeAccount)));
        hash = sha256(abi.encodePacked(hash, _previousStateHash));
        hash = sha256(abi.encodePacked(hash, _newStateHash));
        hash = sha256(abi.encodePacked(hash, uint256(_newTimestamp)));

        bytes memory pubdata = abi.encodePacked(_newPublicData, _offsetCommitment);

        /// The code below is equivalent to `commitment = sha256(abi.encodePacked(hash, _publicData))`

        /// We use inline assembly instead of this concise and readable code in order to avoid copying of `_publicData` (which saves ~90 gas per transfer operation).

        /// Specifically, we perform the following trick:
        /// First, replace the first 32 bytes of `_publicData` (where normally its length is stored) with the value of `hash`.
        /// Then, we call `sha256` precompile passing the `_publicData` pointer and the length of the concatenated byte buffer.
        /// Finally, we put the `_publicData.length` back to its original location (to the first word of `_publicData`).
        assembly {
            let hashResult := mload(0x40)
            let pubDataLen := mload(pubdata)
            mstore(pubdata, hash)
        // staticcall to the sha256 precompile at address 0x2
            let success := staticcall(gas(), 0x2, pubdata, add(pubDataLen, 0x20), hashResult, 0x20)
            mstore(pubdata, pubDataLen)

        // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }

            hash := mload(hashResult)
        }
        return hash;
    }

    /// @notice Accepter accept a fast withdraw, accepter will get a fee of (amount - amountOutMin)
    /// @param accepter Accepter
    /// @param receiver User receive token from accepter
    /// @param tokenId Token id
    /// @param amount Fast withdraw amount
    /// @param withdrawFeeRate Fast withdraw fee rate taken by accepter
    /// @param nonce Used to produce unique accept info
    function accept(address accepter,
        address payable receiver,
        uint16 tokenId,
        uint128 amount,
        uint16 withdrawFeeRate,
        uint32 nonce) external payable nonReentrant {
        // ===Checks===
        uint128 fee = amount * withdrawFeeRate / MAX_WITHDRAW_FEE_RATE;
        uint128 amountReceive = amount - fee;
        require(amountReceive > 0 && amountReceive <= amount, 'ZkLink: invalid amountReceive');

        // token MUST be registered to ZkLink
        Governance.RegisteredToken memory rt = zkLink.governance().getToken(tokenId);
        require(rt.registered, "ZkLink: token not registered");

        // accept tx may be later than block exec tx(with user withdraw op)
        bytes32 hash = calAcceptHash(receiver, tokenId, amount, withdrawFeeRate, nonce);
        require(accepts[hash] == address(0), 'ZkLink: accepted');

        // ===Effects===
        accepts[hash] = accepter;
        // transfer erc20 token from accepter to receiver directly
        if (msg.sender != accepter) {
            require(brokerAllowance(tokenId, accepter, msg.sender) >= amountReceive, 'ZkLink: broker allowance');
            brokerAllowances[tokenId][accepter][msg.sender] -= amountReceive;
        }

        // ===Interactions===
        address tokenAddress = rt.tokenAddress;
        if (tokenAddress == ETH_ADDRESS) {
            (bool success, ) = receiver.call{value: amountReceive}("");
            require(success, "ZkLink: eth send failed");
        } else {
            uint256 balanceBefore = IERC20(tokenAddress).balanceOf(receiver);
            IERC20(tokenAddress).transferFrom(accepter, receiver, amountReceive);
            uint256 balanceAfter = IERC20(tokenAddress).balanceOf(receiver);
            uint256 balanceDiff = balanceAfter.sub(balanceBefore);
            require(balanceDiff >= amountReceive, "ZkLink: token transfer failed");
        }
        emit Accept(accepter, receiver, tokenId, amountReceive);
    }

    function calAcceptHash(address receiver, uint16 tokenId, uint128 amount, uint16 withdrawFeeRate, uint32 nonce) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(receiver, tokenId, amount, withdrawFeeRate, nonce));
    }

    function brokerAllowance(uint16 tokenId, address owner, address spender) public view returns (uint128) {
        return brokerAllowances[tokenId][owner][spender];
    }

    function brokerApprove(uint16 tokenId, address spender, uint128 amount) external returns (bool) {
        // token MUST be registered to ZkLink
        Governance.RegisteredToken memory rt = zkLink.governance().getToken(tokenId);
        require(rt.registered, "ZkLink: token not registered");
        require(spender != address(0), "ZkLink: approve to the zero address");
        brokerAllowances[tokenId][msg.sender][spender] = amount;
        return true;
    }
}