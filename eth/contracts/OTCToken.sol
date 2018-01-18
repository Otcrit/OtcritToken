pragma solidity ^0.4.18;

import './commons/SafeMath.sol';
import './BaseICOToken.sol';

/**
 * @title ERC20 OTC Token https://otcrit.org
 */
contract OTCToken is BaseICOToken {
  using SafeMath for uint;

  string public name = 'Otcrit token';

  string public symbol = 'OTC';

  uint8 public decimals = 18;

  uint internal constant ONE_TOKEN = 1e18;

  /**
   * @dev Constructor
   * @param totalSupplyTokens_ Total amount of tokens supplied
   * @param reservedTeamTokens_ Number of tokens reserved for team
   * @param reservedPartnersTokens_ Number of tokens reserved for partners
   * @param reservedBountyTokens_ Number of tokens reserved for bounty participants
   * @param reservedOtherTokens_ Number of privately distributed tokens reserved for others
   */
  function OTCToken(uint totalSupplyTokens_,
                    uint reservedTeamTokens_,
                    uint reservedPartnersTokens_,
                    uint reservedBountyTokens_,
                    uint reservedOtherTokens_)
    BaseICOToken(totalSupplyTokens_ * ONE_TOKEN) public {
    require(reservedTeamTokens_
            .add(reservedBountyTokens_)
            .add(reservedPartnersTokens_)
            .add(reservedOtherTokens_) <= totalSupplyTokens_);
    reserved[RESERVED_TEAM_SIDE] = reservedTeamTokens_ * ONE_TOKEN;
    reserved[RESERVED_BOUNTY_SIDE] = reservedBountyTokens_ * ONE_TOKEN;
    reserved[RESERVED_PARTNERS_SIDE] = reservedPartnersTokens_ * ONE_TOKEN;
    reserved[RESERVED_OTHERS_SIDE] = reservedOtherTokens_ * ONE_TOKEN;
  }

  // Disable direct payments
  function() external payable {
    revert();
  }

  //---------------------------- OTC specific

  /// @dev Tokens for team members
  uint8 public RESERVED_TEAM_SIDE = 0x1;

  /// @dev Tokens for bounty participants
  uint8 public RESERVED_BOUNTY_SIDE = 0x2;

  /// @dev Tokens for OTCRIT partners
  uint8 public RESERVED_PARTNERS_SIDE = 0x4;

  /// @dev Other privately distributed tokens
  uint8 public RESERVED_OTHERS_SIDE = 0x8;

  /// @dev Token reservation mapping: key(RESERVED_X) => value(number of tokens)
  mapping(uint8 => uint) public reserved;

  /**
   * @dev Get recerved tokens for specific side
   */
  function getReservedTokens(uint8 side_) view public returns (uint) {
    return reserved[side_];
  }

  /**
   * @dev Assign `amount_` of privately distributed tokens
   *      to someone identified with `to_` address.
   * @param to_   Tokens owner
   * @param side_ Group identifier of privately distributed tokens
   * @param amount_ Number of tokens distributed
   */
  function reserve(address to_, uint8 side_, uint amount_) onlyOwner public {
    require(to_ != address(0) && (side_ & 0xf) != 0);
    amount_ = amount_ * ONE_TOKEN;
    availableSupply = availableSupply.sub(amount_);
    // SafeMath will check reserved[side_] >= amount
    reserved[side_] = reserved[side_].sub(amount_);
    balances[to_] = balances[to_].add(amount_);
    ReservedICOTokensDistributed(to_, side_, amount_);
  }

  /// @dev Fired some tokens distributed to someone from team,bounty,parthners,others
  event ReservedICOTokensDistributed(address indexed to, uint8 side, uint amount);
}
