// Factory.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import '@openzeppelin/contracts/math/SafeMath.sol';
import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import './TokenV2.sol';
import './interfaces/ITokenManagerDeployer.sol';
import './interfaces/ITokenManagerV2.sol';
import './interfaces/IFactory.sol';
import './librarys/FullMath.sol';

contract Factory is IFactory, Ownable {
  using SafeMath for uint256;

  uint24 public override protocolFee;
  address public override protocolFeeRecipient;
  uint8 public override oversubscriptionMultiple;

  address public immutable tokenManagerV2Deployer;

  uint256 constant Q96 = 2 ** 96;
  uint256 constant TOLERANCE = 1 * 10 ** 18; // 1 Token

  uint256 public grantId = 0;

  PoolConfig public poolConfig;
  GrantConfig public grantConfig;
  mapping(uint256 => Grant) public grants;

  event SetOversubscriptionMultiple(uint8 oversubscriptionMultiple);
  event SetProtocolFee(uint24 fee);
  event SetProtocolFeeRecipient(address protocolFeeRecipient);
  event GrantCreated(uint256 id, address tokenManager);
  event SetPoolConfig();
  event SetGrantConfig();

  constructor(
    address tokenManagerV2Deployer_,
    address protocolFeeRecipient_,
    uint24 fee_,
    uint8 oversubscriptionMultiple_,
    PoolConfig memory poolConfig_,
    GrantConfig memory grantConfig_
  ) {
    tokenManagerV2Deployer = tokenManagerV2Deployer_;
    protocolFee = fee_;
    protocolFeeRecipient = protocolFeeRecipient_;

    oversubscriptionMultiple = oversubscriptionMultiple_;

    poolConfig = poolConfig_;
    grantConfig = grantConfig_;
  }

  function increasePostId() internal returns (uint256) {
    grantId = grantId + 1;

    return grantId;
  }

  function setProtocolFeeRecipient(address protocolFeeRecipient_) external onlyOwner {
    protocolFeeRecipient = protocolFeeRecipient_;

    emit SetProtocolFeeRecipient(protocolFeeRecipient_);
  }

  function setProtocolFee(uint24 fee_) external onlyOwner {
    protocolFee = fee_;

    emit SetProtocolFee(fee_);
  }

  function setPoolConfig(PoolConfig memory poolConfig_) external onlyOwner {
    require(poolConfig_.WBNB != address(0), 'Invalid WBNB');
    require(poolConfig_.V3factory != address(0), 'Invalid V3factory');
    require(poolConfig_.V3PositionManager != address(0), 'Invalid V3PositionManager');
    require(poolConfig_.V3LPLocker != address(0), 'Invalid V3LPLocker');

    poolConfig = poolConfig_;

    emit SetPoolConfig();
  }

  function setGrantConfig(GrantConfig memory grantConfig_) external onlyOwner {
    require(grantConfig_.duration != 0, 'Invalid duration');
    require(grantConfig_.poolAmountBNBPercent != 0, 'Invalid poolAmountBNBPercent');
    require(grantConfig_.poolAmountTokenPercent != 0, 'Invalid poolAmountTokenPercent');

    grantConfig = grantConfig_;

    emit SetGrantConfig();
  }

  function calculateSqrtPriceX96(uint256 amount0, uint256 amount1) public pure override returns (uint160) {
    uint256 _ratio = FullMath.mulDiv(amount1, Q96 * Q96, amount0);

    return uint160(sqrt(_ratio));
  }

  function sqrt(uint y) internal pure returns (uint z) {
    if (y > 3) {
      z = y;
      uint x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }

  function getGrant(uint256 id) external view override returns (Grant memory) {
    return grants[id];
  }

  function setOversubscriptionMultiple(uint8 oversubscriptionMultiple_) external onlyOwner {
    oversubscriptionMultiple = oversubscriptionMultiple_;

    emit SetOversubscriptionMultiple(oversubscriptionMultiple_);
  }

  function createGrant(CreateGrantParams calldata params) external {
    uint256 _amountBNB = params.grantParams.rigidCapAmount.mul(grantConfig.poolAmountBNBPercent).div(10000);
    uint256 _amountToken = params.totalSupply.mul(grantConfig.poolAmountTokenPercent).div(10000);

    require(verifyPrice(params.grantParams, _amountToken, params.totalSupply), 'Invalid price');

    address _tokenManagerV2 = ITokenManagerDeployer(tokenManagerV2Deployer).deploy();
    TokenV2 _tokenV2 = new TokenV2(params.name, params.symbol, _tokenManagerV2, params.totalSupply);

    ITokenManagerDeployer(tokenManagerV2Deployer).initializeTokenManagerV2(
      _tokenManagerV2,
      address(_tokenV2),
      params.creator,
      ITokenManagerV2.GrantParams({
        price: params.grantParams.price,
        rigidCapAmount: params.grantParams.rigidCapAmount,
        userRigidCapAmount: params.grantParams.userRigidCapAmount,
        startAt: params.grantParams.startAt,
        duration: grantConfig.duration
      }),
      ITokenManagerV2.PoolParams({
        WBNB: poolConfig.WBNB,
        V3factory: poolConfig.V3factory,
        V3PositionManager: poolConfig.V3PositionManager,
        V3LPLocker: poolConfig.V3LPLocker,
        tickLower: poolConfig.tickLower,
        tickUpper: poolConfig.tickUpper,
        V3LPTradingFee: params.poolParams.V3LPTradingFee,
        amountToken: _amountToken,
        amountBNB: _amountBNB
      })
    );

    uint256 id = increasePostId();
    grants[id] = Grant({ id: id, logo: params.logo, desc: params.desc, link: params.link, manager: _tokenManagerV2 });

    emit GrantCreated(id, _tokenManagerV2);
  }

  function verifyPrice(GrantParams memory grantParams_, uint256 _amountToken, uint256 totalSupply) internal returns (bool) {
    if (!grantConfig.enableTokenReserve) {
      uint256 _sellAmount = grantParams_.rigidCapAmount.mul(10 ** 18).div(grantParams_.price);
      uint256 _initialUnlock = totalSupply.mul(10).div(100);

      if (_sellAmount.add(_amountToken) > _initialUnlock) {
        return false;
      }

      uint256 _diff = _initialUnlock - _sellAmount.add(_amountToken);

      if (_diff > 0) {
        return _diff <= TOLERANCE;
      }
    }

    return true;
  }
}
