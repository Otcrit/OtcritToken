pragma solidity ^0.4.18;

import './flavours/Ownable.sol';
import './ICOToken.sol';

contract BaseICO is Ownable {

  enum State {
    Inactive,
    Active,
    Suspended,
    Terminated,
    NotCompleted,
    Completed
  }

  ICOToken public token;

  State public state;

  uint public startAt;

  uint public endAt;

  uint public lowCapWei;

  uint public hardCapWei;

  uint public collectedWei;

  event ICOStarted(uint endAt, uint lowCapWei, uint hardCapWei);
  event ICOResumed(uint endAt, uint lowCapWei, uint hardCapWei);
  event ICOSuspended();
  event ICOTerminated();
  event ICONotCompleted();
  event ICOCompleted(uint collectedWei);
  event ICOInvestment(uint investedWei);

  modifier isSuspended() {
    require(state == State.Suspended);
    _;
  }

  modifier isActive() {
    require(state == State.Active);
    _;
  }

  function start(uint endAt_)
    onlyOwner
    public
  {
    require(endAt_ > block.timestamp);
    require(state == State.Inactive);
    endAt = endAt_;
    startAt = block.timestamp;
    state = State.Active;
    ICOStarted(endAt, lowCapWei, hardCapWei);
  }

  function suspend()
    onlyOwner
    isActive
    public
  {
    state = State.Suspended;
    ICOSuspended();
  }

  function terminate()
    onlyOwner
    public
  {
    require(state != State.Terminated);
    state = State.Terminated;
    ICOTerminated();
  }

  function tune(uint endAt_, uint lowCapWei_, uint hardCapWei_)
    onlyOwner
    isSuspended
    public
  {
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

  function resume()
    onlyOwner
    isSuspended
    public
  {
    state = State.Active;
    ICOResumed(endAt, lowCapWei, hardCapWei);
    touch();
  }

  // Abstract ICO functions

  function touch() public;

  function onInvestment(address from_, uint wei_) public returns (uint);
}