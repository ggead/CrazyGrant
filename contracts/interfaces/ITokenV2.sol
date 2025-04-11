// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

interface ITokenV2 {
  function burn(uint256 _amount) external returns (bool);
}
