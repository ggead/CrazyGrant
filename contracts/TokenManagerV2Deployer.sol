// contracts/TokenManagerV2.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import './TokenManagerV2.sol';
import './interfaces/ITokenManagerDeployer.sol';
import './interfaces/ITokenManagerV2.sol';

contract TokenManagerV2Deployer is ITokenManagerDeployer, Ownable {
  address public factoryAddress;

  /// @notice Emitted when factory address is set
  event SetFactoryAddress(address indexed factory);

  modifier onlyFactory() {
    require(msg.sender == factoryAddress, 'only factory call');
    _;
  }

  function setFactoryAddress(address factoryAddress_) external onlyOwner {
    require(factoryAddress == address(0), 'initialized');

    factoryAddress = factoryAddress_;

    emit SetFactoryAddress(factoryAddress_);
  }

  function deploy() external override onlyFactory returns (address tokenManagerV2) {
    TokenManagerV2 _tokenManagerV2 = new TokenManagerV2();

    return address(_tokenManagerV2);
  }

  function initializeTokenManagerV2(
    address tokenManagerV2_,
    address token_,
    address creator_,
    ITokenManagerV2.GrantParams memory grantParams_,
    ITokenManagerV2.PoolParams memory poolParams_
  ) external override onlyFactory {
    TokenManagerV2(tokenManagerV2_).initialize(factoryAddress, token_, creator_, grantParams_, poolParams_);
  }
}
