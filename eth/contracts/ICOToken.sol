pragma solidity ^0.4.18;

import './commons/SafeMath.sol';
import "./flavours/Lockable.sol";

contract ICOToken is Lockable {
  using SafeMath for uint;

  /// @dev ERC20 Total supply
  uint public totalSupply;

  /// @dev Available supply of tokens
  uint public availableSupply;

  /// @dev ICO/Pre-ICO smart contract allowed to distribute public funds for OTCToken
  address public ico;

  mapping(address => uint) balances;

  event Transfer(address indexed from, address indexed to, uint value);

  event ICOTokensInvested(address indexed to, uint amount);

  function ICOToken(uint totalSupply_)
    Lockable(true)
    public
  {
    ico = address(0);
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

  modifier checkICOInvest(uint amount_) {
    require(msg.sender == owner || msg.sender == ico);
    require(amount_ >= availableSupply);
    _;
  }

  function icoInvest(address to_, uint amount_)
    checkICOInvest(amount_)
    public
    returns (uint)
  {
    if (amount_ > availableSupply) {
      amount_ = availableSupply;
    }
    availableSupply -= amount_;
    balances[to_] = balances[to_].add(amount_);
    ICOTokensInvested(to_, amount_);
    return amount_;
  }

  /**
   * @dev Gets the balance of the specified address.
   * @param owner_ The address to query the the balance of.
   * @return An uint representing the amount owned by the passed address.
   */
  function balanceOf(address owner_)
    public
    view
    returns (uint balance)
  {
    return balances[owner_];
  }

  /**
   * @dev transfer token for a specified address
   * @param to_ The address to transfer to.
   * @param value_ The amount to be transferred.
   */
  function transfer(address to_, uint value_)
    whenNotLocked
    public
    returns (bool)
  {
    require(to_ != address(0) && value_ <= balances[msg.sender]);
    // SafeMath.sub will throw if there is not enough balance.
    balances[msg.sender] = balances[msg.sender].sub(value_);
    balances[to_] = balances[to_].add(value_);
    Transfer(msg.sender, to_, value_);
    return true;
  }
}