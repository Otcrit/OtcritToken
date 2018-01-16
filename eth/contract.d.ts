/// <reference path="../node_modules/web3-typed/callback/web3/index.d.ts" />
import * as Web3 from 'web3';
import { IContractInstance, ISimpleCallable, address, IContract, ITXResult } from './globals';
import { NumberLike } from 'bignumber.js';

interface Artifacts {
  require(name: './OTCToken.sol'): IContract<IOTCToken>;
  require(name: './OTCPreICO.sol'): IContract<IOTCPreICO>;
  require(name: './Migrations.sol'): IContract<IContractInstance>;
}

declare global {
  const artifacts: Artifacts;
}

declare const enum ICOState {
  // ICO is not active and not started
  Inactive = 0,
  // ICO is active, tokens can be distributed among investors.
  // ICO parameters (end date, hard/low caps) cannot be changed.
  Active = 1,
  // ICO is suspended, tokens cannot be distributed among investors.
  // ICO can be resumed to `Active state`.
  // ICO parameters (end date, hard/low caps) may changed.
  Suspended = 2,
  // ICO is termnated by owner, ICO cannot be resumed.
  Terminated,
  // ICO goals are not reached,
  // ICO terminated and cannot be resumed.
  NotCompleted = 3,
  // ICO completed, ICO goals reached successfully,
  // ICO terminated and cannot be resumed.
  Completed = 4
}

/**
 * The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
interface IOwnable {
  owner: ISimpleCallable<address>;

  transferOwnership(newOwner: address, tr?: Web3.TransactionRequest): Promise<ITXResult>;
}

/**
 * Base contract which allows children to
 * implement main operations locking mechanism.
 */
interface ILocable extends IOwnable {
  locked: ISimpleCallable<boolean>;

  lock(tr?: Web3.TransactionRequest): Promise<ITXResult>;

  unlock(tr?: Web3.TransactionRequest): Promise<ITXResult>;
}

/**
 * Not mintable, ERC20 compilant token, distributed by ICO/Pre-ICO.
 */
interface ICOToken extends IContractInstance, ILocable {
  // ERC20 Total supply
  totalSupply: ISimpleCallable<NumberLike>;

  // Available supply of tokens
  availableSupply: ISimpleCallable<NumberLike>;

  // ICO/Pre-ICO smart contract allowed to distribute public funds for this OTCToken
  ico: ISimpleCallable<address>;

  /**
   * Set address of ICO smart-contract which controls token
   * initial token distribution.
   * @param ico ICO contract address.
   */
  changeICO(ico: address, tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * Assign `amount` of tokens to investor identified by `to` address.
   * @param to Investor address.
   * @param amount Number of tokens distributed.
   */
  icoInvestment(to: address, amount: NumberLike, tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * Gets the balance of the specified address.
   * @param owner The address to query the the balance of.
   * @return An uint representing the amount owned by the passed address.
   */
  balanceOf(owner: address, tr?: Web3.TransactionRequest): Promise<NumberLike>;

  /**
   * Transfer token for a specified address
   * @param to The address to transfer to.
   * @param value The amount to be transferred.
   */
  transfer(to: address, value: address, tr?: Web3.TransactionRequest): Promise<ITXResult>;
}

/**
 * ERC20 OTC Token https://otcrit.org
 */
interface IOTCToken extends ICOToken {
  // Token name
  name: ISimpleCallable<string>;

  // Token symbol
  symbol: ISimpleCallable<string>;

  // Token decimals
  decimals: ISimpleCallable<NumberLike>;

  getReservedTokens: {
    call(side: number, tr?: Web3.TransactionRequest): Promise<NumberLike>;
  };

  /**
   * Assign `amount` of privately distributed tokens
   *      to someone identified with `to` address.
   * @param to   Tokens owner
   * @param side Group identifier of privately distributed tokens
   * @param amount Number of tokens distributed
   */
  reserve(to: address, side: number, amount: NumberLike, tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * @dev Transfer tokens from one address to another
   * @param from address The address which you want to send tokens from
   * @param to address The address which you want to transfer to
   * @param value uint the amount of tokens to be transferred
   */
  transferFrom(from: address, to: address, value: NumberLike, tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering.
   *
   * To change the approve amount you first have to reduce the addresses
   * allowance to zero by calling `approve(spender, 0)` if it is not
   * already 0 to mitigate the race condition described in:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   *
   * @param spender The address which will spend the funds.
   * @param value The amount of tokens to be spent.
   */
  approve(spender: address, value: NumberLike, tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * Function to check the amount of tokens that an owner allowed to a spender.
   * @param owner address The address which owns the funds.
   * @param spender address The address which will spend the funds.
   * @return A uint specifying the amount of tokens still available for the spender.
   */
  allowance: {
    call(owner: address, spender: address, tr?: Web3.TransactionRequest): Promise<NumberLike>;
  };
}

/**
 * @dev Base abstract smart contract for any OTCrit ICO
 */
interface IBaseICO extends IContractInstance, IOwnable {
  // ICO controlled token
  token: ISimpleCallable<address>;

  // Current ICO state.
  state: ISimpleCallable<number>;

  // ICO start date seconds since epoch.
  startAt: ISimpleCallable<NumberLike>;

  // ICO end date seconds since epoch.
  endAt: ISimpleCallable<NumberLike>;

  // Minimal amount of investments in wei needed for successfull ICO
  lowCapWei: ISimpleCallable<NumberLike>;

  // Maximal amount of investments in wei for this ICO.
  // If reached ICO will be in `Completed` state.
  hardCapWei: ISimpleCallable<NumberLike>;

  // Number of investments collected by this ICO
  collectedWei: ISimpleCallable<NumberLike>;

  /**
   * Trigger start of ICO.
   * @param endAt ICO end date, seconds since epoch.
   */
  start(endAt: NumberLike, tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * Suspend this ICO.
   * ICO can be activated later by calling `resume()` function.
   * In suspend state, ICO owner can change basic ICO paraneter using `tune()` function,
   * tokens cannot be distributed among investors.
   */
  suspend(tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * Terminate the ICO.
   * ICO goals are not reached, ICO terminated and cannot be resumed.
   */
  terminate(tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * @dev Change basic ICO paraneters. Can be done only during `Suspended` state.
   * Any provided parameter is used only if it is not zero.
   * @param endAt ICO end date seconds since epoch. Used if it is not zero.
   * @param lowCapWei ICO low capacity. Used if it is not zero.
   * @param hardCapWei ICO hard capacity. Used if it is not zero.
   */
  tune(
    endAt: NumberLike,
    lowCapWei: NumberLike,
    hardCapWei: NumberLike,
    tr?: Web3.TransactionRequest
  ): Promise<ITXResult>;

  /**
   * Resume a previously suspended ICO.
   */
  resume(tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * Recalculate ICO state based on current block time.
   * Should be called periodically by ICO owner.
   */
  touch(tr?: Web3.TransactionRequest): Promise<ITXResult>;

  /**
   * Perform investment in this ICO.
   * @param from Investor address.
   * @param wei Amount of invested weis
   * @return Amount of actually invested weis including bonuses.
   */
  onInvestment(from: address, wei: address, tr?: Web3.TransactionRequest): Promise<ITXResult>;
}

/**
 * OTCrit Pre-ICO smart contract.
 */
interface IOTCPreICO extends IBaseICO {
  // @dev 1e18 WEI == 1ETH == 5000 tokens
  WEI_TOKEN_EXCHANGE_RATIO: ISimpleCallable<NumberLike>;

  // Current bonus as percents depending on stage of ICO
  bonusPct: ISimpleCallable<NumberLike>;
}
