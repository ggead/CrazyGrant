// contracts/Token.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import './interfaces/ITokenV2.sol';

contract TokenV2 is ERC20, ITokenV2 {
  constructor(string memory name_, string memory symbol_, address manager_, uint256 totalSupply_) ERC20(name_, symbol_) {
    _mint(manager_, totalSupply_);
  }

  function burn(uint256 _amount) external override returns (bool) {
    address account = _msgSender();
    uint256 accountBalance = balanceOf(account);

    require(account != address(0), 'ERC20: burn from the zero address');
    require(accountBalance >= _amount, 'ERC20: burn amount exceeds balance');

    _burn(account, _amount);

    return true;
  }
}
