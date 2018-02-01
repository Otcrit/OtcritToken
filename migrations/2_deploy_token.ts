const OTCToken = artifacts.require('./OTCToken.sol');
const OTCPreICO = artifacts.require('./OTCPreICO.sol');
export = function(deployer: any) {
  // Set unlimited synchronization timeout
  (<any>OTCToken).constructor.synchronization_timeout = 0;
  (<any>OTCPreICO).constructor.synchronization_timeout = 0;
  deployer.deploy(OTCToken, 100e6, 10e6, 7e6, 8e6, 5e6);
};
