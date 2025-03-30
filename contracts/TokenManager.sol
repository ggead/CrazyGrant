// contracts/TokenManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import './libraries/SafeMath.sol';
import './Token.sol';
import './interfaces/IToken.sol';

contract TokenManager is Context, Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  error Initialized();
  error OnlyCreator();
  error LockPeriodNotExpired();
  error ExceedsUnlockLimit();
  error UnlockPriceNotYetReached();
  error UnlockEnded();

  event Unlock(uint256 amount, uint256 timestamp, uint256 latestPrice);
  event LatestPriceChange(uint256 price);

  Token public token;
  uint constant SIX_MONTH_IN_SECONDS = 6 * 30 * 24 * 60 * 60;

  struct TokenManagerStorage {
    bool initialized;
    address creator;
    uint256 createAt;
    uint256 initialPrice;
    uint256 initialSupply;
    uint256 latestUnlockAt;
    uint256 latestUnlockPrice;
    uint256 latestPrice;
  }

  function s() internal pure returns (TokenManagerStorage storage cs) {
    bytes32 position = keccak256('TokenManager.contract.storage.v1');
    assembly {
      cs.slot := position
    }
  }

  modifier onlyCreator() {
    if (s().creator != _msgSender()) {
      revert OnlyCreator();
    }
    _;
  }

  constructor() Ownable(msg.sender) {}

  function initialize(string memory name_, string memory symbol_, address creator_, uint256 totalSupply_, uint256 initialPrice_) external onlyOwner {
    if (s().initialized) revert Initialized();

    token = new Token(name_, symbol_, address(this), totalSupply_);

    uint256 _initialUnlock = (totalSupply_ * 10) / 100;

    IERC20(address(token)).safeTransfer(creator_, _initialUnlock);

    s().initialized = true;
    s().creator = creator_;
    s().createAt = block.timestamp;
    s().latestUnlockAt = block.timestamp;

    s().initialPrice = initialPrice_;
    s().initialSupply = totalSupply_;
    s().latestUnlockPrice = initialPrice_;
  }

  function unlock(uint256 unlockAmount_) external onlyCreator {
    uint256 maxUnlockAmount = (s().initialSupply * 5) / 100;

    if (s().latestUnlockAt.add(SIX_MONTH_IN_SECONDS) > block.timestamp) {
      revert LockPeriodNotExpired();
    }

    if (s().latestUnlockPrice * 2 > s().latestPrice) {
      revert UnlockPriceNotYetReached();
    }

    if (unlockAmount_ > maxUnlockAmount) {
      revert ExceedsUnlockLimit();
    }

    if (IERC20(address(token)).balanceOf(address(this)) == 0) {
      revert UnlockEnded();
    }

    IERC20(address(token)).safeTransfer(_msgSender(), unlockAmount_);

    if (unlockAmount_ != maxUnlockAmount) {
      IToken(address(token)).burn(maxUnlockAmount.sub(unlockAmount_));
    }

    s().latestUnlockAt = block.timestamp;
    s().latestUnlockPrice = s().latestPrice;
    s().latestPrice = 0;

    emit Unlock(unlockAmount_, block.timestamp, s().latestUnlockPrice);
  }

  function setLatestPrice(uint256 latestPrice_) external onlyCreator {
    if (s().latestUnlockAt.add(SIX_MONTH_IN_SECONDS) > block.timestamp) {
      revert LockPeriodNotExpired();
    }

    s().latestPrice = latestPrice_;

    emit LatestPriceChange(latestPrice_);
  }

  function getState() public pure returns (TokenManagerStorage memory) {
    return s();
  }
}
