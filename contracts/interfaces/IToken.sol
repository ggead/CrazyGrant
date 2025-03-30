// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

interface IToken {
  function burn(uint256 _amount) external returns (bool);
}
