// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import './ITokenManagerV2.sol';

interface ITokenManagerDeployer {
  function deploy() external returns (address);

  function initializeTokenManagerV2(
    address tokenManagerV2_,
    address token_,
    address creator_,
    ITokenManagerV2.GrantParams memory grantParams_,
    ITokenManagerV2.PoolParams memory poolParams_
  ) external;
}
