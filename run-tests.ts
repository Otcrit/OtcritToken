import { ChildProcess, spawn } from 'child_process';
import { Stream } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import MergeStream = require('merge-stream');

let testrpc: ChildProcess;
let mnemonic: string = '';

if (fs.existsSync(path.join(__dirname, './run-tests-mnemonic.txt'))) {
  mnemonic = fs.readFileSync(path.join(__dirname, './run-tests-mnemonic.txt')).toString('utf8').trim();
}

function exit(code: number) {
  process.exit(code);
}

// Run TestRPC
(function() {
  const args = ['-a', '30', '-p', '8549'];
  if (mnemonic != null) {
    args.push('-m', mnemonic);
  }
  testrpc = spawn(path.join(__dirname, './node_modules/.bin/ganache-cli'), args, {
    cwd: __dirname
  });
  MergeStream(testrpc.stdout, testrpc.stderr).pipe(fs.createWriteStream('ganache-cli.log'));
  testrpc.on('error', err => {
    console.error(err);
    exit(-1);
  });
  testrpc.on('close', code => {
    if (code == null) {
      console.log(`TestRPC exited`);
    } else {
      console.log(`TestRPC exited with code ${code}`);
    }
  });
})();

// Run Truffle tests
(function() {
  const truffle = spawn(path.join(__dirname, './node_modules/.bin/truffle'), ['test'], {
    cwd: __dirname
  });
  truffle.on('error', err => {
    console.error(err);
    exit(-1);
  });
  MergeStream(truffle.stdout, truffle.stderr).on('data', (data: Buffer) => {
    process.stdout.write(data);
  });
  truffle.on('close', code => {
    if (testrpc) {
      testrpc.kill();
    }
    if (code === 0) {
      console.log('All tests completed successfully');
    } else {
      console.log('>>>>>>>> Tests failed! <<<<<<<<');
    }
    exit(code);
  });
})();
