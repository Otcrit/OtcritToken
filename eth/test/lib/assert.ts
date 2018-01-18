import { ParsedLog } from 'web3/parsed';

export async function assertEvmThrows(promise: PromiseLike<any>) {
  try {
    await promise;
  } catch (error) {
    const invalidOpcode = error.message.search('revert') >= 0;
    assert(invalidOpcode, "Expected EVM throw, got '" + error + "' instead");
    return;
  }
  assert.fail(new Error('EVM did not throw an exception, as expected!'));
}

export function assertEventValues(log: ParsedLog<string, any>, expectedEventName: string, expectedEventArgs: any) {
  assert.equal(log.event, expectedEventName);
  assert.deepEqual(log.args, expectedEventArgs);
}
