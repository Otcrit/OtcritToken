const OTCToken = artifacts.require('./OTCToken.sol');
export = function(deployer: any) {
  // Set unlimited synchronization timeout
  (<any>OTCToken).constructor.synchronization_timeout = 0;
  // function OTCToken(uint totalSupplyTokens_,
  //                   uint reservedTeamTokens_,
  //                   uint reservedPartnersTokens_,
  //                   uint reservedBountyTokens_,
  //                   uint reservedOtherTokens_)
  deployer.deploy(OTCToken, 100e6, 10e6, 5e6, 10e6, 5e6);
};
