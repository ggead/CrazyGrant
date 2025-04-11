// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

interface IFactory {
  struct Grant {
    uint256 id;
    address manager;
    string logo;
    string desc;
    string link;
  }

  struct PoolConfig {
    address WBNB;
    address V3factory;
    address V3PositionManager;
    address V3LPLocker;
    int24 tickLower;
    int24 tickUpper;
  }

  struct GrantConfig {
    uint24 poolAmountBNBPercent;
    uint24 poolAmountTokenPercent;
    uint256 duration;
    bool enableTokenReserve;
  }

  struct GrantParams {
    uint256 rigidCapAmount;
    uint256 userRigidCapAmount;
    uint256 startAt;
    uint256 price;
  }

  struct PoolParams {
    uint24 V3LPTradingFee;
  }

  struct CreateGrantParams {
    string logo;
    string desc;
    string link;
    string name;
    string symbol;
    address creator;
    uint256 totalSupply;
    GrantParams grantParams;
    PoolParams poolParams;
  }

  function protocolFee() external view returns (uint24);
  function protocolFeeRecipient() external view returns (address);
  function oversubscriptionMultiple() external view returns (uint8);
  function getGrant(uint256 id) external view returns (Grant memory grant);

  function calculateSqrtPriceX96(uint256 amount0, uint256 amount1) external view returns (uint160);
}
