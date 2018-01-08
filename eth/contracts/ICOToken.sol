pragma solidity ^0.4.18;

import "./flavours/Lockable.sol";

contract ICOToken is Lockable {

  /// @dev ERC20 Total supply
  uint public totalSupply;

  /// @dev Available supply of tokens
  uint public availableSupply;

  /// @dev ICO/Pre-ICO smart contract allowed to distribute funds for OTCToken
  address public ico;

  function ICOToken(address ico_, uint totalSupply_)
    Lockable(true)
    public
  {
    ico = ico_;
    totalSupply = totalSupply_;
    availableSupply = totalSupply_;
  }

  function changeICO(address ico_)
    onlyOwner
    public
  {
    require(ico_ != address(0));
    ico = ico_;
  }

  modifier checkICODistribute(uint amount_) {
    require(msg.sender == owner || msg.sender == ico);
    require(amount_ >= availableSupply);
    _;
  }

  function icoDistribute(address to_, uint amount_) public;
}