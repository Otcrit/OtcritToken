import { ParsedLog } from 'web3/parsed';
// we need this to avoid clashing whith other global registered @types/ in other modules
const assert = (<any>global).assert as Chai.AssertStatic;

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

export async function assertEvmInvalidOpcode(promise: PromiseLike<any>) {
  try {
    await promise;
  } catch (error) {
    const invalidOpcode = error.message.search('invalid opcode') >= 0;
    assert(invalidOpcode, "Expected EVM 'invalid opcode', got '" + error + "' instead");
    return;
  }
  assert.fail(new Error('EVM did not throw an exception, as expected!'));
}

export function assertEventValues(log: ParsedLog<string, any>, expectedEventName: string, expectedEventArgs: any) {
  assert.equal(log.event, expectedEventName);
  assert.deepEqual(log.args, expectedEventArgs);
}
