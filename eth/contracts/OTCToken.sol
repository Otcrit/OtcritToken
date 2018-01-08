pragma solidity ^0.4.18;

import './commons/SafeMath.sol';
import './ICOToken.sol';

/**
 * @title ERC20 OTC Token https://otcrit.org
 */
contract OTCToken is ICOToken {

  using SafeMath for uint;

  /**
   * @dev Constructor
   */
  function OTCToken(address ico_,
                    uint totalSupplyTokens_,
                    uint reservedTeamTokens_,
                    uint reservedPartnersTokens_,
                    uint reservedBountyTokens_,
                    uint reservedOtherTokens_)
    ICOToken(ico_, totalSupplyTokens_)
    public
  {
    require(reservedTeamTokens_
            .add(reservedBountyTokens_)
            .add(reservedPartnersTokens_)
            .add(reservedOtherTokens_) <= totalSupply);
    reserved[RESERVED_TEAM_SIDE] = reservedTeamTokens_;
    reserved[RESERVED_BOUNTY_SIDE] = reservedBountyTokens_;
    reserved[RESERVED_PARTNERS_SIDE] = reservedPartnersTokens_;
    reserved[RESERVED_OTHER_SIDE] = reservedOtherTokens_;
  }

  //---------------------------- OTC specific

  uint8 public RESERVED_TEAM_SIDE = 0x1;
  uint8 public RESERVED_BOUNTY_SIDE = 0x2;
  uint8 public RESERVED_PARTNERS_SIDE = 0x4;
  uint8 public RESERVED_OTHER_SIDE = 0x8;

  /// @dev Token reservation mapping: key(RESERVED_X) => value(number of tokens)
  mapping(uint8 => uint) public reserved;

  function reserve(address to_, uint8 side_, uint amount_)
    onlyOwner
    public
  {
    require(to_ != address(0) && (side_ & 0xf) != 0);
    availableSupply.sub(amount_);
    // SafeMath will check reserved[side_] >= amount
    reserved[side_] = reserved[side_].sub(amount_);
    balances[to_] = balances[to_].add(amount_);
    ReservedICOTokensDistributed(to_, side_, amount_);
  }

  function icoDistribute(address to_, uint amount_)
    checkICODistribute(amount_)
    public
  {
    availableSupply.sub(amount_);
    balances[to_] = balances[to_].add(amount_);
    ICOTokensDistributed(to_, amount_);
  }

  event ICOTokensDistributed(address indexed to, uint amount);

  event ReservedICOTokensDistributed(address indexed to, uint8 reservedSide, uint amount);

  //---------------------------- Detailed ERC20 Token

  string public name = 'Otcrit token';

  string public symbol = 'OTC';

  uint8 public decimals = 18;

  mapping(address => uint) balances;

  mapping (address => mapping (address => uint)) private allowed;

  event Approval(address indexed owner, address indexed spender, uint value);

  event Transfer(address indexed from, address indexed to, uint value);

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

  /**
   * @dev Transfer tokens from one address to another
   * @param from_ address The address which you want to send tokens from
   * @param to_ address The address which you want to transfer to
   * @param value_ uint the amount of tokens to be transferred
   */
  function transferFrom(address from_, address to_, uint value_)
    whenNotLocked
    public
    returns (bool)
  {
    require(to_ != address(0));
    require(value_ <= balances[from_]);
    require(value_ <= allowed[from_][msg.sender]);

    balances[from_] = balances[from_].sub(value_);
    balances[to_] = balances[to_].add(value_);
    allowed[from_][msg.sender] = allowed[from_][msg.sender].sub(value_);
    Transfer(from_, to_, value_);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering.
   *
   * To change the approve amount you first have to reduce the addresses
   * allowance to zero by calling `approve(spender_, 0)` if it is not
   * already 0 to mitigate the race condition described in:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   *
   * @param spender_ The address which will spend the funds.
   * @param value_ The amount of tokens to be spent.
   */
  function approve(address spender_, uint value_)
    whenNotLocked
    public
    returns (bool)
  {
    if (value_ != 0 && allowed[msg.sender][spender_] != 0) {
      revert();
    }
    allowed[msg.sender][spender_] = value_;
    Approval(msg.sender, spender_, value_);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param owner_ address The address which owns the funds.
   * @param spender_ address The address which will spend the funds.
   * @return A uint specifying the amount of tokens still available for the spender.
   */
  function allowance(address owner_, address spender_)
    view
    public
    returns (uint)
  {
    return allowed[owner_][spender_];
  }

  //---------------------------- !Standard ERC20 Token
}
