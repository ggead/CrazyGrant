// Reader.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;
import './interfaces/IFactory.sol';
import './interfaces/ITokenManagerV2.sol';

interface IERC20Metadata {
  function name() external view returns (string memory);
}

contract Reader {
  struct GrantInfo {
    uint256 id;
    address manager;
    address token;
    address creator;
    address poolAddress;
    string logo;
    string desc;
    string link;
    string name;
    uint256 price;
    uint256 rigidCapAmount;
    uint256 userRigidCapAmount;
    uint256 startAt;
    uint256 duration;
    uint256 latestUnlockAt;
    uint256 latestUnlockPrice;
    uint256 latestPrice;
    uint256 totalInvest;
    uint256 investors;
    uint256 unlockAmount;
    bool isGrantEnded;
    bool isGrantCompleted;
  }

  function getGrant(address factory_, uint256 id_) public view returns (GrantInfo memory) {
    IFactory _factory = IFactory(factory_);
    IFactory.Grant memory _grant = _factory.getGrant(id_);
    ITokenManagerV2 _tokenManagerV2 = ITokenManagerV2(_grant.manager);
    IERC20Metadata _token = IERC20Metadata(_tokenManagerV2.token());
    (uint256 price, uint256 rigidCapAmount, uint256 userRigidCapAmount, uint256 startAt, uint256 duration) = _tokenManagerV2.grantParams();
    (
      uint256 latestUnlockAt,
      uint256 latestUnlockPrice,
      uint256 latestPrice,
      uint256 totalInvest,
      uint256 investors,
      uint256 unlockAmount
    ) = _tokenManagerV2.grantDetails();

    return
      GrantInfo({
        id: _grant.id,
        manager: _grant.manager,
        token: _tokenManagerV2.token(),
        creator: _tokenManagerV2.creator(),
        poolAddress: _tokenManagerV2.poolAddress(),
        logo: _grant.logo,
        desc: _grant.desc,
        link: _grant.link,
        name: _token.name(),
        price: price,
        rigidCapAmount: rigidCapAmount,
        userRigidCapAmount: userRigidCapAmount,
        startAt: startAt,
        duration: duration,
        latestUnlockAt: latestUnlockAt,
        latestUnlockPrice: latestUnlockPrice,
        latestPrice: latestPrice,
        totalInvest: totalInvest,
        investors: investors,
        unlockAmount: unlockAmount,
        isGrantEnded: _tokenManagerV2.isGrantEnded(),
        isGrantCompleted: _tokenManagerV2.isGrantCompleted()
      });
  }
}
