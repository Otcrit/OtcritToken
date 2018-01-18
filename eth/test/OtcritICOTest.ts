console.log(`Web3 version: ${web3.version.api}`);

import * as BigNumber from 'bignumber.js';
import { IOTCPreICO, ICOState, TokenReservation } from '../contract';
const OTCToken = artifacts.require('./OTCToken.sol');
const OTCPreICO = artifacts.require('./OTCPreICO.sol');

// PreICO Instance
let preIco: IOTCPreICO | null;

interface IActor {
  address: string;
}

contract('OTCPreICO', function(accounts: string[]) {
  let cnt = 0;
  const actors = {
    // Token owner
    owner: { address: accounts[cnt++] },
    someone1: { address: accounts[cnt++] },
    someone2: { address: accounts[cnt++] },
    team1: { address: accounts[cnt++] },
    team2: { address: accounts[cnt++] },
    bounty1: { address: accounts[cnt++] }
  } as { [k: string]: IActor };
  console.log('Actors: ', actors);

  it('should be correct initial token state', async () => {
    const token = await OTCToken.deployed();
    // Total supply
    assert.equal(await token.totalSupply.call(), 100e6);
    // Available supply
    assert.equal(await token.availableSupply.call(), 100e6);
    // Team
    assert.equal(await token.getReservedTokens.call(TokenReservation.Team), 10e6);
    // Partners
    assert.equal(await token.getReservedTokens.call(TokenReservation.Partners), 5e6);
    // Bounty
    assert.equal(await token.getReservedTokens.call(TokenReservation.Bounty), 10e6);
    // Other
    assert.equal(await token.getReservedTokens.call(TokenReservation.Others), 5e6);
    // Token locked
    assert.equal(await token.locked.call(), true);
    // Token owner
    assert.equal(await token.owner.call(), actors['owner'].address);
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
      from: actors.owner.address
    });
    assert.equal(await preIco.token.call(), token.address);
    assert.equal((await preIco.lowCapWei.call()).toString(), new BigNumber('200e18').toString());
    assert.equal((await preIco.hardCapWei.call()).toString(), new BigNumber('1500e18').toString());
    // Token is not controlled by any ICO
    assert.equal(await token.ico.call(), '0x0000000000000000000000000000000000000000');
    // Assign ICO controller contract
    const txres = await token.changeICO(preIco.address.toString(), { from: actors.owner.address });
    assert.equal(txres.logs[0].event, 'ICOChanged');
    assert.equal(await token.ico.call(), preIco.address);
    // Check ico state
    assert.equal(await preIco.state.call(), ICOState.Inactive);
  });

  it('should allow private token distribution', async () => {
    const token = await OTCToken.deployed();
    // Check initial state
    assert.equal(await token.availableSupply.call(), 100e6);
    assert.equal(await token.getReservedTokens.call(TokenReservation.Team), 10e6);
    assert.equal(await token.getReservedTokens.call(TokenReservation.Bounty), 10e6);

    // Do not allow token reservation from
    try {
      await token.reserve(actors.team1.address, TokenReservation.Team, 1e6, { from: actors.someone1.address });
      assert.fail();
    } catch (e) {}

    // Reserve tokens for team member
    let txres = await token.reserve(actors.team1.address, TokenReservation.Team, 1e6, { from: actors.owner.address });
    assert.equal(txres.logs[0].event, 'ReservedICOTokensDistributed');
    assert.equal(txres.logs[0].args.to, actors.team1.address);
    assert.equal(txres.logs[0].args.amount.toString(), '1000000');

    assert.equal(await token.availableSupply.call(), 100e6 - 1e6);
    assert.equal(await token.balanceOf.call(actors.team1.address), 1e6);
    assert.equal(await token.balanceOf.call(actors.someone1.address), 0);
    // check reserved tokens for team
    assert.equal(await token.getReservedTokens.call(TokenReservation.Team), 10e6 - 1e6);

    // Reserve tokens for bounty member
    txres = await token.reserve(actors.bounty1.address, TokenReservation.Bounty, 2e6, { from: actors.owner.address });
    assert.equal(txres.logs[0].event, 'ReservedICOTokensDistributed');
    assert.equal(txres.logs[0].args.to, actors.bounty1.address);
    assert.equal(txres.logs[0].args.amount.toString(), '2000000');

    assert.equal(await token.availableSupply.call(), 100e6 - 1e6 - 2e6);
    assert.equal(await token.balanceOf.call(actors.team1.address), 1e6);
    assert.equal(await token.balanceOf.call(actors.bounty1.address), 2e6);
    // check reserved tokens for bounty
    assert.equal(await token.getReservedTokens.call(TokenReservation.Bounty), 10e6 - 2e6);

    // Try reserve more token than we can
    try {
      await token.reserve(actors.bounty1.address, TokenReservation.Bounty, 10e6 - 2e6 + 1, {
        from: actors.owner.address
      });
      assert.fail();
    } catch (e) {}
  });

  it('should public token operations be locked during ICO', async () => {
    // try transfer some tokens from team1 to someone1
    const token = await OTCToken.deployed();
    try {
      await token.transfer(actors.someone1.address, 1, { from: actors.team1.address });
      assert.fail();
    } catch (e) {}
  });

  it('should start preICO and perform outside investment', async () => {
    const token = await OTCToken.deployed();
    assert.isTrue(preIco != null);
    const ico = preIco!!;
    assert.equal(await ico.state.call(), ICOState.Inactive);
    const endAt = Math.floor(+new Date() / 1000 + 100 /* 100 sec for ico */);
    await ico.start(endAt, { from: actors.owner.address });
    assert.equal(await ico.state.call(), ICOState.Active);
    assert.equal(await ico.endAt.call(), endAt);
    const startAt: number = +await ico.startAt.call();
    assert.isTrue(endAt - startAt >= 100);
    // todo
  });
});

export = {};
