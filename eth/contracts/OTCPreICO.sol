pragma solidity ^0.4.18;

import './commons/SafeMath.sol';
import './ICOToken.sol';

contract OTCPreICO is Ownable {
  using SafeMath for uint;

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

  uint public distributedWei;

  event ICOStarted(uint endAt, uint lowCapWei, uint hardCapWei);
  event ICOResumed(uint endAt, uint lowCapWei, uint hardCapWei);
  event ICOSuspended();
  event ICOTerminated();
  event ICONotCompleted();
  event ICOCompleted(uint distributedWei);

  modifier isSuspended() {
    require(state == State.Suspended);
    _;
  }

  modifier isNotSuspended() {
    require(state != State.Suspended);
    _;
  }

  modifier isActive() {
    require(state == State.Active);
    _;
  }

  function PreICO(address icoToken_, uint lowCapWei_, uint hardCapWei_)
    public
  {
    require(icoToken_ != address(0));
    token = ICOToken(icoToken_);
    state = State.Inactive;
    lowCapWei = lowCapWei_;
    hardCapWei = hardCapWei_;
  }

  function touch()
    onlyOwner
    public
  {
    if (state != State.Active) {
      return;
    }
    // todo
  }

  function start(uint endAt_)
    onlyOwner
    public
  {
    require(endAt_ > block.timestamp);
    require(state == State.Inactive);
    endAt = endAt_;
    ICOStarted(endAt, lowCapWei, hardCapWei);
  }

  function suspend()
    onlyOwner
    public
  {
    require(state == State.Active);
    state = State.Suspended;
    ICOSuspended();
  }

  function tune(uint endAt_, uint lowCapWei_, uint hardCapWei_)
    onlyOwner
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
  }

  function resume()
    onlyOwner
    public
  {
    require(state == State.Suspended);
    state = State.Active;
    ICOResumed(endAt, lowCapWei, hardCapWei);
  }
}