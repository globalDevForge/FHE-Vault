// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {ERC7984USDT} from "./ERC7984USDT.sol";

/// @title FHEVault
/// @notice Enables users to mint fUSDT, stake in the vault, and withdraw their stake while preserving encrypted balances.
contract FHEVault is SepoliaConfig {
    ERC7984USDT public immutable token;

    mapping(address => uint256) private _stakes;
    mapping(address => euint64) private _stakesCipher;
    uint256 private _totalStaked;
    euint64 private _totalStakedCipher;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    error InvalidToken();
    error InvalidAmount();
    error InsufficientStake();

    constructor(address tokenAddress_) {
        if (tokenAddress_ == address(0)) {
            revert InvalidToken();
        }

        token = ERC7984USDT(tokenAddress_);
    }

    /// @notice Stakes a plaintext amount of fUSDT into the vault.
    /// @param amount The amount to stake, expressed with the token decimals (6 decimals by default).
    function stake(uint64 amount) external {
        if (amount == 0) {
            revert InvalidAmount();
        }

        uint256 currentStake = _stakes[msg.sender];
        uint256 newStake = currentStake + amount;
        _stakes[msg.sender] = newStake;

        _totalStaked += amount;

        euint64 encryptedAmount = FHE.asEuint64(amount);
        _updateEncryptedStake(msg.sender, encryptedAmount, true);
        _updateTotalEncryptedStake(encryptedAmount, true);

        FHE.allow(encryptedAmount, address(this));
        FHE.allow(encryptedAmount, address(token));

        token.confidentialTransferFrom(msg.sender, address(this), encryptedAmount);

        emit Staked(msg.sender, amount);
    }

    /// @notice Withdraws a plaintext amount of staked fUSDT from the vault.
    /// @param amount The amount to withdraw, expressed with the token decimals (6 decimals by default).
    function withdraw(uint64 amount) external {
        if (amount == 0) {
            revert InvalidAmount();
        }

        uint256 currentStake = _stakes[msg.sender];
        if (currentStake < amount) {
            revert InsufficientStake();
        }

        uint256 newStake = currentStake - amount;
        _stakes[msg.sender] = newStake;

        _totalStaked -= amount;

        euint64 encryptedAmount = FHE.asEuint64(amount);
        _updateEncryptedStake(msg.sender, encryptedAmount, false);
        _updateTotalEncryptedStake(encryptedAmount, false);

        FHE.allow(encryptedAmount, address(this));
        FHE.allow(encryptedAmount, address(token));

        token.confidentialTransfer(msg.sender, encryptedAmount);

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Returns the plaintext vault stake of a given user.
    function getStake(address user) external view returns (uint256) {
        return _stakes[user];
    }

    /// @notice Returns the encrypted vault stake of a given user.
    function getStakeCipher(address user) external view returns (euint64) {
        return _stakesCipher[user];
    }

    /// @notice Returns the total plaintext stake locked in the vault.
    function getTotalStaked() external view returns (uint256) {
        return _totalStaked;
    }

    /// @notice Returns the encrypted total stake locked in the vault.
    function getTotalStakedCipher() external view returns (euint64) {
        return _totalStakedCipher;
    }

    /// @notice Returns whether the vault is authorized as operator for a holder.
    function isVaultOperator(address holder) external view returns (bool) {
        return token.isOperator(holder, address(this));
    }

    /// @notice Exposes the underlying fUSDT token address.
    function tokenAddress() external view returns (address) {
        return address(token);
    }

    /// @notice Returns the encrypted balance of the vault inside the token contract.
    function getVaultBalanceCipher() external view returns (euint64) {
        return token.confidentialBalanceOf(address(this));
    }

    function _updateEncryptedStake(address user, euint64 amount, bool isAddition) private {
        euint64 currentCipher = _stakesCipher[user];
        euint64 updatedCipher;

        if (!FHE.isInitialized(currentCipher)) {
            updatedCipher = amount;
        } else {
            updatedCipher = isAddition ? FHE.add(currentCipher, amount) : FHE.sub(currentCipher, amount);
        }

        FHE.allowThis(updatedCipher);
        FHE.allow(updatedCipher, user);

        _stakesCipher[user] = updatedCipher;
    }

    function _updateTotalEncryptedStake(euint64 amount, bool isAddition) private {
        if (!FHE.isInitialized(_totalStakedCipher)) {
            _totalStakedCipher = amount;
        } else {
            _totalStakedCipher = isAddition ? FHE.add(_totalStakedCipher, amount) : FHE.sub(_totalStakedCipher, amount);
        }

        FHE.allowThis(_totalStakedCipher);
    }
}
