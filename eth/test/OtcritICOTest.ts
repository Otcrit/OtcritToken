console.log(`Web3 version: ${web3.version.api}`);

import * as BigNumber from 'bignumber.js';
import { IOTCPreICO, ICOState, TokenReservation } from '../contract';
import { assertEvmInvalidOpcode, assertEvmThrows } from './lib/assert';
import { web3LatestTime, Seconds, web3IncreaseTime } from './lib/time';
import { NumberLike } from 'bignumber.js';
import { watchFile } from 'mz/fs';
import { ItTestFn } from 'eth/globals';
const OTCToken = artifacts.require('./OTCToken.sol');
const OTCPreICO = artifacts.require('./OTCPreICO.sol');

const ONE_TOKEN = new BigNumber('1e18');
const ETH_TOKEN_EXCHANGE_RATIO = 5000;

declare global {
  const it: ItTestFn;
}

function tokens(val: NumberLike): string {
  return new BigNumber(val).times(ONE_TOKEN).toString();
}

function tokens2wei(val: NumberLike): string {
  return new BigNumber(val)
    .times(ONE_TOKEN)
    .divToInt(ETH_TOKEN_EXCHANGE_RATIO)
    .toString();
}

function wei2rawtokens(val: NumberLike): string {
  return new BigNumber(val).mul(ETH_TOKEN_EXCHANGE_RATIO).toString();
}

// PreICO Instance
let preIco: IOTCPreICO | null;

const state = {
  teamWalletInitialBalance: new BigNumber(0),
  sentWei: new BigNumber(0)
};

contract('OTCRIT', function(accounts: string[]) {
  let cnt = 0;
  const actors = {
    // Token owner
    owner: accounts[cnt++],
    someone1: accounts[cnt++],
    someone2: accounts[cnt++],
    team1: accounts[cnt++],
    team2: accounts[cnt++],
    bounty1: accounts[cnt++],
    investor1: accounts[cnt++],
    investor2: accounts[cnt++],
    investor3: accounts[cnt++],
    teamWallet: accounts[cnt++]
  } as { [k: string]: string };
  console.log('Actors: ', actors);

  it('should be correct initial token state', async () => {
    const token = await OTCToken.deployed();
    // Total supply
    assert.equal(await token.totalSupply.call(), tokens(100e6).toString());
    // Team
    assert.equal(await token.getReservedTokens.call(TokenReservation.Team), tokens(10e6));
    // Partners
    assert.equal(await token.getReservedTokens.call(TokenReservation.Partners), tokens(5e6));
    // Bounty
    assert.equal(await token.getReservedTokens.call(TokenReservation.Bounty), tokens(10e6));
    // Other
    assert.equal(await token.getReservedTokens.call(TokenReservation.Others), tokens(5e6));

    // Available supply
    assert.equal(
      await token.availableSupply.call(),
      new BigNumber(tokens(100e6))
        .sub(tokens(10e6))
        .sub(tokens(5e6))
        .sub(tokens(10e6))
        .sub(tokens(5e6))
        .toString()
    );

    // Token locked
    assert.equal(await token.locked.call(), true);
    // Token owner
    assert.equal(await token.owner.call(), actors.owner);
    // Token name
    assert.equal(await token.name.call(), 'Otcrit token');
    // Token symbol
    assert.equal(await token.symbol.call(), 'OTC');
    // Token decimals
    assert.equal(await token.decimals.call(), 18);
  });

  it('should pre-ico contract deployed', async () => {
    const token = await OTCToken.deployed();
    // Create preICO contract
    preIco = await OTCPreICO.new(
      token.address,
      actors.teamWallet,
      new BigNumber('100e18'),
      new BigNumber('1500e18'),
      new BigNumber('5e16'), // 0.05 eth
      new BigNumber('150e18'), // 150 eth
      {
        // 150 eth
        from: actors.owner
      }
    );
    state.teamWalletInitialBalance = await web3.eth.getBalance(actors.teamWallet);
    assert.equal(await preIco.token.call(), token.address);
    assert.equal(await preIco.teamWallet.call(), actors.teamWallet);
    assert.equal((await preIco.lowCapWei.call()).toString(), new BigNumber('100e18').toString());
    assert.equal((await preIco.hardCapWei.call()).toString(), new BigNumber('1500e18').toString());
    assert.equal((await preIco.lowCapTxWei.call()).toString(), new BigNumber('5e16').toString());
    assert.equal((await preIco.hardCapTxWei.call()).toString(), new BigNumber('150e18').toString());

    // Token is not controlled by any ICO
    assert.equal(await token.ico.call(), '0x0000000000000000000000000000000000000000');
    // Assign ICO controller contract
    const txres = await token.changeICO(preIco.address, { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ICOChanged');
    assert.equal(await token.ico.call(), preIco.address);

    // Ensure no others can check ICO contract fot token
    await assertEvmThrows(token.changeICO(preIco.address, { from: actors.someone1 }));

    // Check ico state
    assert.equal(await preIco.state.call(), ICOState.Inactive);
  });

  it('should allow private token distribution', async () => {
    const token = await OTCToken.deployed();
    // Check initial state
    assert.equal(await token.getReservedTokens.call(TokenReservation.Team), tokens(10e6));
    assert.equal(await token.getReservedTokens.call(TokenReservation.Bounty), tokens(10e6));

    // Do not allow token reservation from others
    await assertEvmThrows(
      token.assignReserved(actors.team1, TokenReservation.Team, tokens(1e6), { from: actors.someone1 })
    );

    // // Reserve tokens for team member
    let txres = await token.assignReserved(actors.team1, TokenReservation.Team, tokens(1e6), { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ReservedTokensDistributed');
    assert.equal(txres.logs[0].args.to, actors.team1);
    assert.equal(txres.logs[0].args.amount, tokens(1e6));

    assert.equal(await token.balanceOf.call(actors.team1), tokens(1e6));
    assert.equal(await token.balanceOf.call(actors.someone1), 0);
    // check reserved tokens for team
    assert.equal(await token.getReservedTokens.call(TokenReservation.Team), tokens(10e6 - 1e6));

    // Reserve tokens for bounty member
    txres = await token.assignReserved(actors.bounty1, TokenReservation.Bounty, tokens(2e6), { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ReservedTokensDistributed');
    assert.equal(txres.logs[0].args.to, actors.bounty1);
    assert.equal(txres.logs[0].args.amount.toString(), tokens(2e6));

    assert.equal(await token.balanceOf.call(actors.team1), tokens(1e6));
    assert.equal(await token.balanceOf.call(actors.bounty1), tokens(2e6));
    // check reserved tokens for bounty
    assert.equal(await token.getReservedTokens.call(TokenReservation.Bounty), tokens(10e6 - 2e6));
    // Do not allow reserve more than allowed tokens
    await assertEvmInvalidOpcode(
      token.assignReserved(actors.bounty1, TokenReservation.Bounty, tokens(10e6 - 2e6 + 1), { from: actors.owner })
    );
  });

  it('should public token operations be locked during ICO', async () => {
    // try transfer some tokens from team1 to someone1
    const token = await OTCToken.deployed();
    await assertEvmThrows(token.transfer(actors.someone1, 1, { from: actors.team1 }));
  });

  it('check preICO investements, preICO start-to-completed lifecycle', async () => {
    const token = await OTCToken.deployed();
    assert.isTrue(preIco != null);
    const ico = preIco!!;
    assert.equal(await ico.state.call(), ICOState.Inactive);

    // ICO will end in 2 weeks
    const endAt = web3LatestTime() + Seconds.weeks(2);
    await ico.start(endAt, { from: actors.owner });
    assert.equal(await ico.state.call(), ICOState.Active);
    assert.equal(await ico.endAt.call(), endAt);

    // Check link
    assert.equal(await token.ico.call(), ico.address);
    assert.equal(await ico.token.call(), token.address);

    // Perform investements (investor1)
    let investor1Tokens = new BigNumber(0);
    const balance = web3.eth.getBalance(actors.investor1);
    assert.equal(balance.toString(), new BigNumber('100e18').toString());

    // Check deny not white-listed addresse
    await assertEvmThrows(
      ico.sendTransaction({
        value: tokens2wei(5000),
        from: actors.investor1
      })
    );

    // Add investor1 to white-list
    await ico.whitelist(actors.investor1);
    // Now it can buy tokens
    let txres = await ico.sendTransaction({
      value: tokens2wei(5000),
      from: actors.investor1
    });
    state.sentWei = state.sentWei.add(tokens2wei(5000));
    assert.equal(txres.logs[0].event, 'ICOInvestment');
    assert.equal(txres.logs[0].args.investedWei, tokens2wei(5000).toString());
    assert.equal(txres.logs[0].args.bonusPct, 15);
    assert.equal(
      txres.logs[0].args.tokens,
      wei2rawtokens(txres.logs[0].args.investedWei.mul(115).divToInt(100)).toString()
    );
    investor1Tokens = investor1Tokens.add(txres.logs[0].args.tokens);
    assert.equal(await token.balanceOf.call(actors.investor1), txres.logs[0].args.tokens.toString());
    assert.equal(await token.balanceOf.call(actors.investor1), investor1Tokens.toString());

    // Add investor2 to white-list
    await ico.whitelist(actors.investor2);
    txres = await ico.sendTransaction({
      value: tokens2wei(15000),
      from: actors.investor2
    });
    state.sentWei = state.sentWei.add(tokens2wei(15000));
    assert.equal(txres.logs[0].event, 'ICOInvestment');
    assert.equal(txres.logs[0].args.investedWei, tokens2wei(15000).toString());
    assert.equal(txres.logs[0].args.bonusPct, 15);
    assert.equal(
      txres.logs[0].args.tokens,
      wei2rawtokens(txres.logs[0].args.investedWei.mul(115).divToInt(100)).toString()
    );
    assert.equal(await token.balanceOf.call(actors.investor2), txres.logs[0].args.tokens.toString());

    // + 1 week
    await web3IncreaseTime(Seconds.weeks(1));
    txres = await ico.sendTransaction({
      value: tokens2wei(5000),
      from: actors.investor1
    });
    state.sentWei = state.sentWei.add(tokens2wei(5000));
    assert.equal(txres.logs[0].event, 'ICOInvestment');
    assert.equal(txres.logs[0].args.investedWei, tokens2wei(5000).toString());
    assert.equal(txres.logs[0].args.bonusPct, 10);
    assert.equal(
      txres.logs[0].args.tokens,
      wei2rawtokens(txres.logs[0].args.investedWei.mul(110).divToInt(100)).toString()
    );
    investor1Tokens = investor1Tokens.add(txres.logs[0].args.tokens);
    assert.equal(await token.balanceOf.call(actors.investor1), investor1Tokens.toString());

    // Perform rest of investment required to fill low-cap
    await ico.whitelist(actors.investor3);
    let requiredWei = new BigNumber(await ico.lowCapWei.call());
    requiredWei = requiredWei.sub(await ico.collectedWei.call());
    txres = await ico.sendTransaction({
      value: requiredWei,
      from: actors.investor3
    });
    state.sentWei = state.sentWei.add(requiredWei);
    assert.equal(txres.logs[0].event, 'ICOInvestment');
    assert.equal(txres.logs[0].args.investedWei, requiredWei.toString());
    assert.equal((await ico.lowCapWei.call()).toString(), (await ico.collectedWei.call()).toString());

    // Block investor3
    await ico.blacklist(actors.investor3);
    await assertEvmThrows(
      ico.sendTransaction({
        value: tokens2wei(1000),
        from: actors.investor3
      })
    );

    // +1 week will force end of preICO.
    await web3IncreaseTime(Seconds.weeks(1) + 1);

    // Try to invest outside of preICO
    await assertEvmThrows(
      ico.sendTransaction({
        value: tokens2wei(1000),
        from: actors.investor1
      })
    );
    assert.equal(await ico.state.call(), ICOState.Active);
    txres = await ico.touch({ from: actors.owner });
    assert.equal(txres.logs[0].event, 'ICOCompleted');
    assert.equal(await ico.state.call(), ICOState.Completed);
  });

  it('Should team wallet match invested funds after pre-ico', async () => {
    assert.equal(
      new BigNumber(web3.eth.getBalance(actors.teamWallet)).sub(state.teamWalletInitialBalance).toString(),
      state.sentWei.toString()
    );
  });
});

export = {};
