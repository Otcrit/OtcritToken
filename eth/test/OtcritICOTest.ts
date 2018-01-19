console.log(`Web3 version: ${web3.version.api}`);

import * as BigNumber from 'bignumber.js';
import { IOTCPreICO, ICOState, TokenReservation } from '../contract';
import { assertEvmInvalidOpcode, assertEvmThrows } from './lib/assert';
import { web3LatestTime, Seconds, web3IncreaseTime } from './lib/time';
import { NumberLike } from 'bignumber.js';
const OTCToken = artifacts.require('./OTCToken.sol');
const OTCPreICO = artifacts.require('./OTCPreICO.sol');

const ONE_TOKEN = new BigNumber('1e18');
const ETH_TOKEN_EXCHANGE_RATIO = 5000;

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
    investor3: accounts[cnt++]
  } as { [k: string]: string };
  console.log('Actors: ', actors);

  it('should be correct initial token state', async () => {
    const token = await OTCToken.deployed();
    // Total supply
    assert.equal(await token.totalSupply.call(), tokens(100e6));
    // Available supply
    assert.equal(await token.availableSupply.call(), tokens(100e6));
    // Team
    assert.equal(await token.getReservedTokens.call(TokenReservation.Team), tokens(10e6));
    // Partners
    assert.equal(await token.getReservedTokens.call(TokenReservation.Partners), tokens(5e6));
    // Bounty
    assert.equal(await token.getReservedTokens.call(TokenReservation.Bounty), tokens(10e6));
    // Other
    assert.equal(await token.getReservedTokens.call(TokenReservation.Others), tokens(5e6));
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
    preIco = await OTCPreICO.new(token.address, new BigNumber('200e18'), new BigNumber('1500e18'), {
      from: actors.owner
    });
    assert.equal(await preIco.token.call(), token.address);
    assert.equal((await preIco.lowCapWei.call()).toString(), new BigNumber('200e18').toString());
    assert.equal((await preIco.hardCapWei.call()).toString(), new BigNumber('1500e18').toString());
    // Token is not controlled by any ICO
    assert.equal(await token.ico.call(), '0x0000000000000000000000000000000000000000');
    // Assign ICO controller contract
    const txres = await token.changeICO(preIco.address, { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ICOChanged');
    assert.equal(await token.ico.call(), preIco.address);
    // Check ico state
    assert.equal(await preIco.state.call(), ICOState.Inactive);
  });

  it('should allow private token distribution', async () => {
    const token = await OTCToken.deployed();
    // Check initial state
    assert.equal(await token.availableSupply.call(), tokens(100e6));
    assert.equal(await token.getReservedTokens.call(TokenReservation.Team), tokens(10e6));
    assert.equal(await token.getReservedTokens.call(TokenReservation.Bounty), tokens(10e6));

    // Do not allow token reservation from others
    await assertEvmThrows(token.reserve(actors.team1, TokenReservation.Team, tokens(1e6), { from: actors.someone1 }));

    // // Reserve tokens for team member
    let txres = await token.reserve(actors.team1, TokenReservation.Team, tokens(1e6), { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ReservedICOTokensDistributed');
    assert.equal(txres.logs[0].args.to, actors.team1);
    assert.equal(txres.logs[0].args.amount, tokens(1e6));

    assert.equal(await token.availableSupply.call(), tokens(100e6 - 1e6));
    assert.equal(await token.balanceOf.call(actors.team1), tokens(1e6));
    assert.equal(await token.balanceOf.call(actors.someone1), 0);
    // check reserved tokens for team
    assert.equal(await token.getReservedTokens.call(TokenReservation.Team), tokens(10e6 - 1e6));

    // Reserve tokens for bounty member
    txres = await token.reserve(actors.bounty1, TokenReservation.Bounty, tokens(2e6), { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ReservedICOTokensDistributed');
    assert.equal(txres.logs[0].args.to, actors.bounty1);
    assert.equal(txres.logs[0].args.amount.toString(), tokens(2e6));

    assert.equal(await token.availableSupply.call(), tokens(100e6 - 1e6 - 2e6));
    assert.equal(await token.balanceOf.call(actors.team1), tokens(1e6));
    assert.equal(await token.balanceOf.call(actors.bounty1), tokens(2e6));
    // check reserved tokens for bounty
    assert.equal(await token.getReservedTokens.call(TokenReservation.Bounty), tokens(10e6 - 2e6));
    // Do not allow reserve more than allowed tokens
    await assertEvmInvalidOpcode(
      token.reserve(actors.bounty1, TokenReservation.Bounty, tokens(10e6 - 2e6 + 1), { from: actors.owner })
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
    assert.equal(await ico.bonusPct.call(), 15);

    // Check link
    assert.equal(await token.ico.call(), ico.address);
    assert.equal(await ico.token.call(), token.address);

    // Perform investements (investor1)
    let investor1Tokens = new BigNumber(0);
    let txres = await ico.onInvestment(actors.investor1, tokens2wei(5000), { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ICOInvestment');
    assert.equal(
      txres.logs[0].args.investedWei,
      new BigNumber(tokens2wei(5000))
        .mul(115)
        .divToInt(100)
        .toString()
    );
    investor1Tokens = investor1Tokens.add(txres.logs[0].args.tokens);
    assert.equal(txres.logs[0].args.tokens, wei2rawtokens(txres.logs[0].args.investedWei).toString());
    assert.equal(await token.balanceOf.call(actors.investor1), txres.logs[0].args.tokens.toString());

    // Perform investements (investor2)
    txres = await ico.onInvestment(actors.investor2, tokens2wei(15000), { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ICOInvestment');
    assert.equal(txres.logs[0].args.bonusPct, 15);
    assert.equal(
      txres.logs[0].args.investedWei,
      new BigNumber(tokens2wei(15000))
        .mul(115)
        .divToInt(100)
        .toString()
    );
    assert.equal(txres.logs[0].args.tokens, wei2rawtokens(txres.logs[0].args.investedWei).toString());
    assert.equal(txres.logs[0].args.from, actors.investor2);
    assert.equal(await token.balanceOf.call(actors.investor2), txres.logs[0].args.tokens.toString());

    // + 1 week
    await web3IncreaseTime(Seconds.weeks(1));
    txres = await ico.onInvestment(actors.investor1, tokens2wei(5000), { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ICOInvestment');
    assert.equal(txres.logs[0].args.bonusPct, 10);
    assert.equal(
      txres.logs[0].args.investedWei,
      new BigNumber(tokens2wei(5000))
        .mul(110)
        .divToInt(100)
        .toString()
    );
    assert.equal(txres.logs[0].args.tokens, wei2rawtokens(txres.logs[0].args.investedWei).toString());
    investor1Tokens = investor1Tokens.add(txres.logs[0].args.tokens);
    assert.equal(await token.balanceOf.call(actors.investor1), investor1Tokens.toString());

    // Perform rest of investment required to fill low-cap
    let requiredWei = new BigNumber(await ico.lowCapWei.call());
    requiredWei = requiredWei.sub(await ico.collectedWei.call());
    txres = await ico.onInvestment(actors.investor3, requiredWei, { from: actors.owner });
    assert.equal(txres.logs[0].event, 'ICOInvestment');

    // Ensure collectedWei equal lowCapWei
    assert.equal((await ico.lowCapWei.call()).toString(), (await ico.collectedWei.call()).toString());

    // +1 week will force end of preICO.
    await web3IncreaseTime(Seconds.weeks(1));
    txres = await ico.touch({ from: actors.owner });
    assert.equal(txres.logs[0].event, 'ICOCompleted');

    // Check preICO state
    assert.equal(await ico.state.call(), ICOState.Completed);

    // Try to invest outside of preICO
    txres = await ico.onInvestment(actors.investor1, tokens2wei(1), { from: actors.owner });
    // Ensure that no investment logs was fired
    assert.equal(txres.logs.length, 0);
  });
});

export = {};
