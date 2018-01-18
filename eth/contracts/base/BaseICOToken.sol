pragma solidity ^0.4.18;

import '../commons/SafeMath.sol';
import "./BaseFixedERC20Token.sol";

/**
 * @dev Not mintable, ERC20 compilant token, distributed by ICO/Pre-ICO.
 */
contract BaseICOToken is BaseFixedERC20Token {

  /// @dev Available supply of tokens
  uint public availableSupply;

  /// @dev ICO/Pre-ICO smart contract allowed to distribute public funds for this OTCToken
  address public ico;

  /// @dev Fired if investment for `amount` of tokens performed by `to` address
  event ICOTokensInvested(address indexed to, uint amount);

  /// @dev ICO contract changed for this token
  event ICOChanged(address indexed icoContract);

  /**
   * @dev Not mintable, ERC20 compilant token, distributed by ICO/Pre-ICO.
   * @param totalSupply_ Total tokens supply.
   */
  function BaseICOToken(uint totalSupply_) public {
    locked = true;
    totalSupply = totalSupply_;
    availableSupply = totalSupply_;
  }

  function isValidICOInvestment(address to_, uint amount_) internal view returns(bool) {
    return msg.sender == ico && to_ != address(0) && amount_ <= availableSupply;
  }

  /**
   * @dev Set address of ICO smart-contract which controls token
   * initial token distribution.
   * @param ico_ ICO contract address.
   */
  function changeICO(address ico_) onlyOwner public {
    require(ico_ != address(0));
    ico = ico_;
    ICOChanged(ico);
  }

  /**
   * @dev Assign `amount_` of tokens to investor identified by `to_` address.
   * @param to_ Investor address.
   * @param amount_ Number of tokens distributed.
   */
  function icoInvestment(address to_, uint amount_) public returns (uint) {
    require(isValidICOInvestment(to_, amount_));
    if (amount_ > availableSupply) {
      amount_ = availableSupply;
    }
    availableSupply -= amount_;
    balances[to_] = balances[to_].add(amount_);
    ICOTokensInvested(to_, amount_);
    return amount_;
  }
}