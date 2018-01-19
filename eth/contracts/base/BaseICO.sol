pragma solidity ^0.4.18;

import '../flavours/Ownable.sol';
import './BaseICOToken.sol';

/**
 * @dev Base abstract smart contract for any OTCrit ICO
 */
contract BaseICO is Ownable {

  /// @dev ICO state
  enum State {
    // ICO is not active and not started
    Inactive,
    // ICO is active, tokens can be distributed among investors.
    // ICO parameters (end date, hard/low caps) cannot be changed.
    Active,
    // ICO is suspended, tokens cannot be distributed among investors.
    // ICO can be resumed to `Active state`.
    // ICO parameters (end date, hard/low caps) may changed.
    Suspended,
    // ICO is termnated by owner, ICO cannot be resumed.
    Terminated,
    // ICO goals are not reached,
    // ICO terminated and cannot be resumed.
    NotCompleted,
    // ICO completed, ICO goals reached successfully,
    // ICO terminated and cannot be resumed.
    Completed
  }

  /// @dev Token which controlled by this ICO
  BaseICOToken public token;

  /// @dev Current ICO state.
  State public state;

  /// @dev ICO start date seconds since epoch.
  uint public startAt;

  /// @dev ICO end date seconds since epoch.
  uint public endAt;

  /// @dev Minimal amount of investments in wei needed for successfull ICO
  uint public lowCapWei;

  /// @dev Maximal amount of investments in wei for this ICO.
  /// If reached ICO will be in `Completed` state.
  uint public hardCapWei;

  /// @dev Number of investments collected by this ICO
  uint public collectedWei;

  // ICO state transition events
  event ICOStarted(uint indexed endAt, uint lowCapWei, uint hardCapWei);
  event ICOResumed(uint indexed endAt, uint lowCapWei, uint hardCapWei);
  event ICOSuspended();
  event ICOTerminated();
  event ICONotCompleted();
  event ICOCompleted(uint collectedWei);
  event ICOInvestment(address indexed from, uint investedWei, uint tokens, uint8 bonusPct);

  modifier isSuspended() {
    require(state == State.Suspended);
    _;
  }

  modifier isActive() {
    require(state == State.Active);
    _;
  }

  /**
   * @dev Trigger start of ICO.
   * @param endAt_ ICO end date, seconds since epoch.
   */
  function start(uint endAt_) onlyOwner public {
    require(endAt_ > block.timestamp && state == State.Inactive);
    endAt = endAt_;
    startAt = block.timestamp;
    state = State.Active;
    ICOStarted(endAt, lowCapWei, hardCapWei);
  }

  /**
   * @dev Suspend this ICO.
   * ICO can be activated later by calling `resume()` function.
   * In suspend state, ICO owner can change basic ICO paraneter using `tune()` function,
   * tokens cannot be distributed among investors.
   */
  function suspend() onlyOwner isActive public {
    state = State.Suspended;
    ICOSuspended();
  }

  /**
   * @dev Terminate the ICO.
   * ICO goals are not reached, ICO terminated and cannot be resumed.
   */
  function terminate() onlyOwner public {
    require(state != State.Terminated &&
            state != State.NotCompleted &&
            state != State.Completed);
    state = State.Terminated;
    ICOTerminated();
  }

  /**
   * @dev Change basic ICO paraneters. Can be done only during `Suspended` state.
   * Any provided parameter is used only if it is not zero.
   * @param endAt_ ICO end date seconds since epoch. Used if it is not zero.
   * @param lowCapWei_ ICO low capacity. Used if it is not zero.
   * @param hardCapWei_ ICO hard capacity. Used if it is not zero.
   */
  function tune(uint endAt_, uint lowCapWei_, uint hardCapWei_) onlyOwner isSuspended public {
    if (endAt_ > block.timestamp) {
      endAt = endAt_;
    }
    if (lowCapWei_ > 0) {
      lowCapWei = lowCapWei_;
    }
    if (hardCapWei_ > 0) {
      hardCapWei = hardCapWei_;
    }
    touch();
  }

  /**
   * @dev Resume a previously suspended ICO.
   */
  function resume() onlyOwner isSuspended public {
    state = State.Active;
    ICOResumed(endAt, lowCapWei, hardCapWei);
    touch();
  }

  /**
   * @dev Recalculate ICO state based on current block time.
   * Should be called periodically by ICO owner.
   */
  function touch() public;

  /**
   * Perform investment in this ICO.
   * @param from_ Investor address.
   * @param wei_ Amount of invested weis
   * @return Amount of actually invested weis including bonuses.
   */
  function onInvestment(address from_, uint wei_) public;
}