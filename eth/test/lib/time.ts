/**
 * Seconds conversion methods
 */
export const Seconds = {
  seconds(val: number) {
    return val;
  },
  minutes(val: number) {
    return val * this.seconds(60);
  },
  hours(val: number) {
    return val * this.minutes(60);
  },
  days(val: number) {
    return val * this.hours(24);
  },
  weeks(val: number) {
    return val * this.days(7);
  },
  years(val: number) {
    return val * this.days(365);
  }
};

/**
 * Last mined block time seconds since epoch
 */
export function web3LatestTime(): number {
  return web3.eth.getBlock('latest')!!.timestamp;
}

/**
 * Increases blockchain time by the passed duration in seconds
 * @param duration
 */
export function web3IncreaseTime(duration: number): Promise<any> {
  const id = Date.now();
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration],
        id
      },
      err1 => {
        if (err1) {
          return reject(err1);
        }
        web3.currentProvider.sendAsync(
          {
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: id + 1
          },
          (err2, res) => {
            return err2 ? reject(err2) : resolve(res);
          }
        );
      }
    );
  });
}

/**
 * Increases blockchain time to target `time` in seconds
 * @param time
 */
export function web3IncreaseTimeTo(time: number) {
  const now = web3LatestTime();
  if (time < now) {
    throw Error('Cannot increase current time to a moment in the past');
  }
  return web3IncreaseTime(time - now);
}
