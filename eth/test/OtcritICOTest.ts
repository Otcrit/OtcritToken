console.log(`Web3 version: ${web3.version.api}`);

import * as BigNumber from 'bignumber.js';
import { IOTCPreICO, ICOState } from '../contract';
const OTCToken = artifacts.require('./OTCToken.sol');
const OTCPreICO = artifacts.require('./OTCPreICO.sol');

// PreICO Instance
let preIco: IOTCPreICO | null;

interface IActor {
  address: string;
}

contract('OTCPreICO', function(accounts: string[]) {
  const actors = {
    // Token owner
    owner: { address: accounts[0] }
  } as { [k: string]: IActor };
  console.log('Actors: ', actors);

  it('should be correct initial token state', async () => {
    const token = await OTCToken.deployed();
    // Total supply
    assert.equal(await token.totalSupply.call(), 100e6);
    // Available supply
    assert.equal(await token.availableSupply.call(), 100e6);
    // Team
    assert.equal(await token.getReservedTokens.call(0x1), 10e6);
    // Partners
    assert.equal(await token.getReservedTokens.call(0x4), 5e6);
    // Bounty
    assert.equal(await token.getReservedTokens.call(0x2), 10e6);
    // Other
    assert.equal(await token.getReservedTokens.call(0x8), 5e6);
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
    preIco = await OTCPreICO.new(token.address, new BigNumber('200e18'), new BigNumber('1500e18'));
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
});

export = {};
