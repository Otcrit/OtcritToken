pragma solidity ^0.4.18;

import './commons/SafeMath.sol';
import "./flavours/Lockable.sol";

/**
 * @dev Not mintable, ERC20 compilant token, distributed by ICO/Pre-ICO.
 */
contract ICOToken is Lockable {
  using SafeMath for uint;

  /// @dev ERC20 Total supply
  uint public totalSupply;

  /// @dev Available supply of tokens
  uint public availableSupply;

  /// @dev ICO/Pre-ICO smart contract allowed to distribute public funds for this OTCToken
  address public ico;

  mapping(address => uint) balances;

  /// @dev Fired if Token transfered accourding to ERC20
  event Transfer(address indexed from, address indexed to, uint value);

  /// @dev Fired if investment for `amount` of tokens performed by `to` address
  event ICOTokensInvested(address indexed to, uint amount);

  /**
   * @dev Not mintable, ERC20 compilant token, distributed by ICO/Pre-ICO.
   * @param totalSupply_ Total tokens supply.
   */
  function ICOToken(uint totalSupply_)
    Lockable(true)
    public
  {
    ico = address(0);
    totalSupply = totalSupply_;
    availableSupply = totalSupply_;
  }

  modifier checkICOInvestment(uint amount_) {
    require(msg.sender == owner || msg.sender == ico);
    require(amount_ >= availableSupply);
    _;
  }

  /**
   * @dev Set address of ICO smart-contract which controls token
   * initial token distribution.
   * @param ico_ ICO contract address.
   */
  function changeICO(address ico_)
    onlyOwner
    public
  {
    require(ico_ != address(0));
    ico = ico_;
  }

  /**
   * @dev Assign `amount_` of tokens to investor identified by `to_` address.
   * @param to_ Investor address.
   * @param amount_ Number of tokens distributed.
   */
  function icoInvestment(address to_, uint amount_)
    checkICOInvestment(amount_)
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
   * @dev Transfer token for a specified address
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