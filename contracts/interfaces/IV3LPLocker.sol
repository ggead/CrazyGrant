// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

interface IV3LPLocker {
  event OnLock(uint256 indexed lockId, address nftPositionManager, address owner, uint256 nftId, uint256 endTime);
  event OnUnlock(uint256 indexed lockId, address owner, uint256 nftId, uint256 unlockedTime);

  function lock(
    address nftManager_,
    uint256 nftId_,
    address owner_,
    address collector_,
    uint256 endTime_,
    string memory feeName_
  ) external payable returns (uint256 lockId);

  function unlock(uint256 lockId_) external;
}
