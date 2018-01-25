const Migrations = artifacts.require('./Migrations.sol');
export = function(deployer: any) {
  // Set unlimited synchronization timeout
  (<any>Migrations).constructor.synchronization_timeout = 0;
  deployer.deploy(Migrations);
};
