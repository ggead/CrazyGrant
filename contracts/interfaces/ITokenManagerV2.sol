// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

interface ITokenManagerV2 {
  struct GrantParams {
    // decimal = 18
    uint256 price;
    uint256 rigidCapAmount;
    uint256 userRigidCapAmount;
    uint256 startAt;
    uint256 duration;
  }

  struct PoolParams {
    address WBNB;
    address V3factory;
    address V3PositionManager;
    address V3LPLocker;
    uint24 V3LPTradingFee;
    int24 tickLower;
    int24 tickUpper;
    uint256 amountToken;
    uint256 amountBNB;
  }

  function getMaxInvest() external view returns (uint256);
  function getTotalInvest() external view returns (uint256);
  function isGrantEnded() external view returns (bool);
  function isGrantCompleted() external view returns (bool);
  function poolAddress() external view returns (address);
  function token() external view returns (address);
  function creator() external view returns (address);

  function grantParams() external view returns (uint256 price, uint256 rigidCapAmount, uint256 userRigidCapAmount, uint256 startAt, uint256 duration);
  function grantDetails()
    external
    view
    returns (uint256 latestUnlockAt, uint256 latestUnlockPrice, uint256 latestPrice, uint256 totalInvest, uint256 investors, uint256 unlockAmount);
}
