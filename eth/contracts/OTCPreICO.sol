pragma solidity ^0.4.18;

import './commons/SafeMath.sol';
import './base/BaseICO.sol';

/**
 * @title OTCrit Pre-ICO smart contract.
 */
contract OTCPreICO is BaseICO {
  using SafeMath for uint;

  /// @dev 18 decimals for token
  uint internal constant ONE_TOKEN = 1e18;

  /// @dev 1e18 WEI == 1ETH == 5000 tokens
  uint public constant ETH_TOKEN_EXCHANGE_RATIO = 5000;

  /// @dev 15% bonus at start of Pre-ICO
  uint8 public bonusPct = 15;

  event ICOStarted(address icoToken, uint lowCapWei, uint hardCapWei);

  function OTCPreICO(address icoToken_, uint lowCapWei_, uint hardCapWei_) public {
    require(icoToken_ != address(0));
    token = BaseICOToken(icoToken_);
    state = State.Inactive;
    lowCapWei = lowCapWei_;
    hardCapWei = hardCapWei_;
    ICOStarted(icoToken_, lowCapWei_, hardCapWei_);
  }

  /**
   * @dev Recalculate ICO state based on current block time.
   * Should be called periodically by ICO owner.
   */
  function touch() onlyOwner public {
    if (state != State.Active && state != State.Suspended) {
      return;
    }
    if (bonusPct != 10 && (block.timestamp - startAt >= 1 weeks)) {
      bonusPct = 10; // Decrease bonus to 10%
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

  /**
   * Perform investment in this ICO.
   * @param from_ Investor address.
   * @param wei_ Amount of invested weis
   */
  function onInvestment(address from_, uint wei_) onlyOwner public {
    require(wei_ != 0 && from_ != address(0) && token != address(0));
    touch();
    if (state == State.Active) {
      // todo rounding errors?
      uint iwei = bonusPct > 0 ? wei_.mul(100 + bonusPct).div(100) : wei_;
      uint itokens = iwei * ETH_TOKEN_EXCHANGE_RATIO;
      token.icoInvestment(from_, itokens); // Transfer tokens to investor
      collectedWei = collectedWei.add(wei_);
      ICOInvestment(from_, iwei, itokens, bonusPct);
      touch();
    }
  }

  /**
   * Disable direct payments
   */
  function() external payable {
    revert();
  }
}