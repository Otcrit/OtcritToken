import * as BigNumber from 'bignumber.js';
const OTCToken = artifacts.require('./OTCToken.sol');
const OTCPreICO = artifacts.require('./OTCPreICO.sol');
export = async function(deployer: any) {
  // Set unlimited synchronization timeout
  (<any>OTCPreICO).constructor.synchronization_timeout = 0;
  const token = await OTCToken.deployed();
  deployer.deploy(
    OTCPreICO,
    token.address, // token address
    new BigNumber('200e18').toString(), // low cap
    new BigNumber('1500e18').toString() // hard cap
  );
};
