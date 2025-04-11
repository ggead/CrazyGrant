// contracts/TokenManagerV2.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@pancakeswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import './interfaces/IWBNB.sol';
import './interfaces/ITokenManagerV2.sol';
import './interfaces/IPancakeV3Factory.sol';
import './interfaces/IPancakeV3Pool.sol';
import './interfaces/IPositionManager.sol';
import './interfaces/IFactory.sol';
import './interfaces/ITokenV2.sol';
import './interfaces/IV3LPLocker.sol';

interface ITokenDecimals {
  function decimals() external view returns (uint8);
}

contract TokenManagerV2 is IERC721Receiver, Ownable, ReentrancyGuard, ITokenManagerV2 {
  using SafeMath for uint256;

  event LiquidityAdded(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
  event LiquidityWithdrawn(uint256 amount, uint256 timestamp);
  event Invest(uint256 amount, address indexed user, uint256 timestamp);
  event Claimed(uint256 amount, uint256 refundAmount, address indexed user, uint256 timestamp);
  event Refunded(uint256 amount, address indexed user, uint256 timestamp);
  event OnTokenUnlock(uint256 amount, uint256 burnAmount, uint256 latestPrice, uint256 timestamp);
  event LatestPriceChange(uint256 price, uint256 timestamp);
  event WithdrawnGrantFund(uint256 _tokenAmount, uint256 amount, uint256 timestamp);
  event SetTermination(uint256 timestamp);
  event OnLPUnlock(uint256 tokenId, uint256 timestamp);

  uint constant SIX_MONTH_IN_SECONDS = 6 * 30 * 24 * 60 * 60;
  uint256 constant TEN_YEARS_IN_SECONDS = 10 * 365 days;
  uint8 constant UNLOCK_NUM = 18;

  struct UserInfo {
    uint256 investAmount;
    bool refunded;
    bool claimed;
  }

  struct GrantDetails {
    uint256 latestUnlockAt;
    // decimal = 18
    uint256 latestUnlockPrice;
    // decimal = 18
    uint256 latestPrice;
    uint256 totalInvest;
    uint256 investors;
    uint256 unlockAmount;
  }

  struct LiquidityParams {
    uint256 tokenId;
    uint128 liquidity;
    uint256 lockId;
  }

  bool public initialized;
  bool public termination = false;
  address public override token;
  address public override creator;
  address public factory;
  uint256 public totalSupply;
  bool public poolInitialized;
  bool public withdrawalCompleted;
  address public override poolAddress;
  GrantParams public override grantParams;
  GrantDetails public override grantDetails;
  PoolParams public poolParams;
  LiquidityParams public liquidityParams;
  mapping(address => UserInfo) public userInfo;

  constructor() {}

  modifier onlyCreator() {
    require(creator == _msgSender(), 'Only Creator');

    _;
  }

  function initialize(
    address factory_,
    address token_,
    address creator_,
    GrantParams memory grantParams_,
    PoolParams memory poolParams_
  ) external onlyOwner {
    require(!initialized, 'Initialized');
    require(factory_ != address(0), 'Invalid factory');
    require(token_ != address(0), 'Invalid token');
    require(creator_ != address(0), 'Invalid creator');

    // Lock total supply
    totalSupply = IERC20(token_).totalSupply();

    uint256 _sellAmount = getSellAmount(token_, grantParams_);
    uint256 _initialUnlock = getInitialUnlock();

    require(_sellAmount.add(poolParams_.amountToken) <= _initialUnlock, 'params error');

    initialized = true;
    factory = factory_;
    token = token_;
    creator = creator_;
    grantParams = grantParams_;
    poolParams = poolParams_;

    grantDetails = GrantDetails({
      latestUnlockAt: block.timestamp,
      latestUnlockPrice: grantParams_.price,
      latestPrice: 0,
      totalInvest: 0,
      investors: 0,
      unlockAmount: 0
    });
  }

  function getMaxInvest() public view override returns (uint256) {
    uint256 _multiple = uint256(IFactory(factory).oversubscriptionMultiple());

    return grantParams.rigidCapAmount.mul(_multiple);
  }

  function getTotalInvest() public view override returns (uint256) {
    return grantDetails.totalInvest;
  }

  function getUserInfo(address user) public view returns (UserInfo memory) {
    return userInfo[user];
  }

  function getFee() public view returns (uint256) {
    uint256 _fee = uint256(IFactory(factory).protocolFee());

    return grantParams.rigidCapAmount.mul(_fee).div(10000);
  }

  function getTokenSupply() public view returns (uint256) {
    return totalSupply;
  }

  function getInitialUnlock() public view returns (uint256) {
    return getTokenSupply().mul(10).div(100);
  }

  function getSellAmount(address token_, GrantParams memory grantParams_) public view returns (uint256) {
    uint256 _decimals = uint256(ITokenDecimals(token_).decimals());

    return grantParams_.rigidCapAmount.mul(10 ** _decimals).div(grantParams_.price);
  }

  function isGrantEnded() public view override returns (bool) {
    return grantParams.startAt.add(grantParams.duration) < block.timestamp || termination;
  }

  function isGrantCompleted() public view override returns (bool) {
    uint256 _totalInvest = getTotalInvest();

    if (!isGrantEnded()) {
      return _totalInvest >= getMaxInvest();
    }

    return _totalInvest >= grantParams.rigidCapAmount;
  }

  function startTrade() internal {
    // @todo In fact, the gas for create pool is paid by the user, so we can consider giving users a certain subsidy here.
    require(isGrantCompleted(), 'Grant Not Completed');

    transferProtocolFee();

    PoolParams memory _poolParams = poolParams;
    address _token = token;
    address _WBNB = _poolParams.WBNB;
    address _token0 = _token < _WBNB ? _token : _WBNB;
    address _token1 = _token < _WBNB ? _WBNB : _token;
    uint256 _amount0Desired = _token < _WBNB ? _poolParams.amountToken : _poolParams.amountBNB;
    uint256 _amount1Desired = _token < _WBNB ? _poolParams.amountBNB : _poolParams.amountToken;

    uint160 sqrtPriceX96 = IFactory(factory).calculateSqrtPriceX96(_amount0Desired, _amount1Desired);
    address _pool = createPool(_token0, _token1, _poolParams.V3LPTradingFee, sqrtPriceX96);

    IWBNB(_WBNB).deposit{ value: _poolParams.amountBNB }();

    TransferHelper.safeApprove(_token, _poolParams.V3PositionManager, _poolParams.amountToken);
    TransferHelper.safeApprove(_WBNB, _poolParams.V3PositionManager, _poolParams.amountBNB);

    IPositionManager.MintParams memory _params = IPositionManager.MintParams({
      token0: _token0,
      token1: _token1,
      fee: _poolParams.V3LPTradingFee,
      tickLower: _poolParams.tickLower,
      tickUpper: _poolParams.tickUpper,
      amount0Desired: _amount0Desired,
      amount1Desired: _amount1Desired,
      amount0Min: 0,
      amount1Min: 0,
      recipient: address(this),
      deadline: block.timestamp + 15 minutes
    });

    (uint256 _tokenId, uint128 _liquidity, uint256 _amount0, uint256 _amount1) = IPositionManager(_poolParams.V3PositionManager).mint(_params);

    // lock LP
    uint256 _lockId = lockLP(_tokenId);

    liquidityParams.liquidity = _liquidity;
    liquidityParams.tokenId = _tokenId;
    liquidityParams.lockId = _lockId;

    poolAddress = _pool;
    poolInitialized = true;

    emit LiquidityAdded(_tokenId, _liquidity, _amount0, _amount1);
  }

  function createPool(address tokenA, address tokenB, uint24 fee, uint160 sqrtPriceX96) internal returns (address pool) {
    PoolParams memory _poolParams = poolParams;

    pool = IPancakeV3Factory(_poolParams.V3factory).createPool(tokenA, tokenB, fee);

    IPancakeV3Pool(pool).initialize(sqrtPriceX96);
  }

  function lockLP(uint256 tokenId_) internal returns (uint256 lockId) {
    PoolParams memory _poolParams = poolParams;

    IPositionManager(_poolParams.V3PositionManager).approve(_poolParams.V3LPLocker, tokenId_);

    lockId = IV3LPLocker(_poolParams.V3LPLocker).lock(
      _poolParams.V3PositionManager,
      tokenId_,
      address(this),
      address(this),
      block.timestamp.add(TEN_YEARS_IN_SECONDS),
      'DEFAULT'
    );
  }

  function transferProtocolFee() internal {
    TransferHelper.safeTransferETH(IFactory(factory).protocolFeeRecipient(), getFee());
  }

  function invest() external payable nonReentrant {
    uint256 _value = msg.value;
    address _user = _msgSender();
    uint256 _totalInvest = getTotalInvest();
    UserInfo memory _userInfo = getUserInfo(_user);
    GrantParams memory _grantParams = grantParams;
    uint256 _rigidCapAmount = getMaxInvest();

    require(_value > 0, 'Invalid Value');
    require(_grantParams.startAt < block.timestamp, 'Not Start');
    require(_userInfo.investAmount.add(_value) <= _grantParams.userRigidCapAmount, 'Exceeds User Hard Cap');
    require(_totalInvest.add(_value) <= _rigidCapAmount, 'Exceeds Hard Cap');
    require(!isGrantEnded(), 'Grant Ended');

    userInfo[_user].investAmount = _value.add(_userInfo.investAmount);
    grantDetails.totalInvest += _value;

    if (_userInfo.investAmount == 0) {
      grantDetails.investors = grantDetails.investors.add(1);
    }

    if (_totalInvest.add(_value) == _rigidCapAmount) {
      startTrade();
    }

    emit Invest(_value, _user, block.timestamp);
  }

  function claim() external nonReentrant {
    address _sender = _msgSender();
    UserInfo memory _userInfo = getUserInfo(_sender);

    require(isGrantCompleted(), 'Grant Not Completed');
    require(_userInfo.investAmount > 0, 'Non Claimble Amount');

    userInfo[_sender].claimed = true;

    if (!poolInitialized) {
      startTrade();
    }

    GrantParams memory _grantParams = grantParams;
    uint256 _totalInvest = getTotalInvest();
    uint256 _decimals = uint256(ITokenDecimals(token).decimals());

    // My Allocation=（My Invested/Total Raise）* Sale Amount
    // Refund=（My Invested - My Allocation）

    uint256 _myAllocation = (_userInfo.investAmount.mul(_grantParams.rigidCapAmount)).div(_totalInvest);
    uint256 _refund = _userInfo.investAmount.sub(_myAllocation);

    uint256 _myAllocationToken = _myAllocation.mul(10 ** _decimals).div(_grantParams.price);

    TransferHelper.safeTransfer(token, _sender, _myAllocationToken);
    TransferHelper.safeTransferETH(_sender, _refund);

    emit Claimed(_myAllocationToken, _refund, _sender, block.timestamp);
  }

  function refund() external nonReentrant {
    address _sender = _msgSender();
    UserInfo memory _userInfo = getUserInfo(_sender);

    require(isGrantEnded(), 'Grant Not Ended');
    require(_userInfo.investAmount > 0 && !_userInfo.refunded && !isGrantCompleted(), 'Non Refundable Amount');

    userInfo[_sender].refunded = true;

    TransferHelper.safeTransferETH(_sender, _userInfo.investAmount);

    emit Refunded(_userInfo.investAmount, _sender, block.timestamp);
  }

  function withdrawalGrantFund() external onlyCreator nonReentrant {
    uint256 _amount = grantParams.rigidCapAmount.sub(poolParams.amountBNB).sub(getFee());

    require(poolInitialized, 'Requires pool to initialized');
    require(!withdrawalCompleted, 'Funds have been withdrawn');
    require(_amount > 0, 'No withdrawable funds available');

    withdrawalCompleted = true;

    uint256 _sellAmount = getSellAmount(token, grantParams);
    uint256 _initialUnlock = getInitialUnlock();
    uint256 _tokenAmount = _initialUnlock.sub(_sellAmount).sub(poolParams.amountToken);

    TransferHelper.safeTransfer(token, creator, _tokenAmount);
    TransferHelper.safeTransferETH(_msgSender(), _amount);

    emit WithdrawnGrantFund(_tokenAmount, _amount, block.timestamp);
  }

  function unlockLP() external onlyCreator nonReentrant {
    PoolParams memory _poolParams = poolParams;
    address _sender = _msgSender();
    address _WBNB = _poolParams.WBNB;

    uint256 balance0 = IERC20(token).balanceOf(address(this));
    uint256 balance1 = IERC20(_WBNB).balanceOf(address(this));

    IV3LPLocker(_poolParams.V3LPLocker).unlock(liquidityParams.lockId);

    // LP Fees
    uint256 amount0 = IERC20(token).balanceOf(address(this)) - balance0;
    uint256 amount1 = IERC20(_WBNB).balanceOf(address(this)) - balance1;

    TransferHelper.safeTransfer(token, _sender, amount0);
    TransferHelper.safeTransfer(_WBNB, _sender, amount1);

    IPositionManager(_poolParams.V3PositionManager).safeTransferFrom(address(this), _sender, liquidityParams.tokenId);

    emit OnLPUnlock(liquidityParams.tokenId, block.timestamp);
  }

  function unlock(uint256 unlockAmount_) external onlyCreator nonReentrant {
    IERC20 _token = IERC20(token);
    uint256 _maxUnlockAmount = getTokenSupply().mul(5).div(100);

    require(grantDetails.latestUnlockAt.add(SIX_MONTH_IN_SECONDS) < block.timestamp, 'Lock Period Not Expired');
    require(grantDetails.latestUnlockPrice.mul(2) <= grantDetails.latestPrice, 'Unlock Price Not Yet Reached');
    require(unlockAmount_ <= _maxUnlockAmount, 'Exceeds Unlock Limit');
    require(isGrantCompleted(), 'Grant Not Completed');
    require(_token.balanceOf(address(this)) >= _maxUnlockAmount, 'Unlock Ended');
    require(grantDetails.unlockAmount.div(_maxUnlockAmount) < UNLOCK_NUM, 'Unlock Ended');

    grantDetails.latestUnlockAt = block.timestamp;

    TransferHelper.safeTransfer(token, _msgSender(), unlockAmount_);

    uint256 _burnAmount = unlockAmount_ != _maxUnlockAmount ? _maxUnlockAmount.sub(unlockAmount_) : 0;
    if (_burnAmount > 0) {
      ITokenV2(token).burn(_burnAmount);
    }

    grantDetails.latestUnlockPrice = grantDetails.latestPrice;
    grantDetails.latestPrice = 0;
    grantDetails.unlockAmount += _maxUnlockAmount;

    emit OnTokenUnlock(unlockAmount_, _burnAmount, grantDetails.latestUnlockPrice, block.timestamp);
  }

  function setLatestPrice(uint256 latestPrice_) external onlyCreator {
    require(grantDetails.latestUnlockAt.add(SIX_MONTH_IN_SECONDS) < block.timestamp, 'Lock Period Not Expired');

    grantDetails.latestPrice = latestPrice_;

    emit LatestPriceChange(latestPrice_, block.timestamp);
  }

  function setTermination() external onlyCreator {
    require(!isGrantCompleted() && !isGrantEnded(), 'Termination is not supported');

    termination = true;

    emit SetTermination(block.timestamp);
  }

  function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external pure override returns (bytes4) {
    return IERC721Receiver.onERC721Received.selector;
  }
}
