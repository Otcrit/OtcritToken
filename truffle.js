module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 500
    }
  },
  mocha: {
    useColors: true
  },
  networks: {
    development: {
      network_id: '*', // Match any network id
      host: 'localhost',
      port: 8549
    }
    // ropsten: {
    //   network_id: '3',
    //   host: 'localhost',
    //   port: 8545,
    //   from: '0x0063c650f5131A70695CFA32d30d94b634dCA113',
    //   gas: 4500000,
    //   gasPrice: 25e9
    // },
    // mainnet: {
    //   network_id: '1',
    //   host: 'localhost',
    //   port: 8545,
    //   from: '0x86f09b4a10307102ab8dd3cecdfc4738c92dfcfc',
    //   gas: 5000000,
    //   gasPrice: 5e9
    // }
  }
};
