pragma solidity ^0.4.18;

import './commons/SafeMath.sol';
import './base/BaseICO.sol';

// Audit: If this contract is used for the full ICO not only the pre-sale it might make sense to rename it to OTCCrowdsale or something similar

 
/**
 * @title OTCrit Pre-ICO smart contract.
 */
contract OTCPreICO is BaseICO {
  using SafeMath for uint;

  /// @dev 18 decimals for token
  uint internal constant ONE_TOKEN = 1e18;

  /// @dev 1e18 WEI == 1ETH == 5000 tokens
  uint public constant ETH_TOKEN_EXCHANGE_RATIO = 5000;

  // Audit: It might be better for these setters to be in a constructur in the BaseICO
  function OTCPreICO(address icoToken_,
                     address teamWallet_,
                     uint lowCapWei_,
                     uint hardCapWei_,
                     uint lowCapTxWei_,
                     uint hardCapTxWei_) public {
    require(icoToken_ != address(0) && teamWallet_ != address(0));
    token = BaseICOToken(icoToken_); 
    teamWallet = teamWallet_;
    state = State.Inactive;
    lowCapWei = lowCapWei_;
    hardCapWei = hardCapWei_;
    lowCapTxWei = lowCapTxWei_;
    hardCapTxWei = hardCapTxWei_;
  }

  /**
   * @dev Recalculate ICO state based on current block time.
   * Should be called periodically by ICO owner.
   */
  function touch() public {
    if (state != State.Active && state != State.Suspended) {
      return;
    }
    if (collectedWei >= hardCapWei) {
      state = State.Completed;
      endAt = block.timestamp;
      ICOCompleted(collectedWei);
    } else if (block.timestamp >= endAt) {
      if (collectedWei < lowCapWei) {
        state = State.NotCompleted;
        ICONotCompleted();
      } else {
        state = State.Completed;
        ICOCompleted(collectedWei);
      }
    }
  }

  function buyTokens() public payable {
    require(state == State.Active &&
            block.timestamp <= endAt &&
            msg.value >= lowCapTxWei &&
            msg.value <= hardCapTxWei &&
            collectedWei + msg.value <= hardCapWei &&
            whitelisted(msg.sender) );
    uint amountWei = msg.value;
    uint8 bonus = (block.timestamp - startAt >= 1 weeks) ? 10 : 15;
    uint iwei = bonus > 0 ? amountWei.mul(100 + bonus).div(100) : amountWei;
    uint itokens = iwei * ETH_TOKEN_EXCHANGE_RATIO;
    token.icoInvestment(msg.sender, itokens); // Transfer tokens to investor
    collectedWei = collectedWei.add(amountWei);
    ICOInvestment(msg.sender, amountWei, itokens, bonus);
    forwardFunds();
    touch();
  }

  /**
   * Accept direct payments
   */
  function() external payable {
    buyTokens();
  }
}