pragma solidity ^0.4.18;

import "./Ownable.sol";

/**
 * @title Lockable
 * @dev Base contract which allows children to
 *      implement main operations locking mechanism.
 */
contract Lockable is Ownable {
  event Lock();
  event Unlock();

  bool public locked = false;

  /**
   * @dev Modifier to make a function callable
  *       only when the contract is not locked.
   */
  modifier whenNotLocked() {
    require(!locked);
    _;
  }

  /**
   * @dev Modifier to make a function callable
   *      only when the contract is locked.
   */
  modifier whenLocked() {
    require(locked);
    _;
  }

  /**
   * @dev called by the owner to locke, triggers locked state
   */
  function lock() onlyOwner whenNotLocked public {
    locked = true;
    Lock();
  }

  /**
   * @dev called by the owner
   *      to unlock, returns to unlocked state
   */
  function unlock() onlyOwner whenLocked public {
    locked = false;
    Unlock();
  }
}
