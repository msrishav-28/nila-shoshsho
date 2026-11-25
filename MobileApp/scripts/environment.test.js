import {execFileSync} from 'node:child_process';
import path from 'node:path';

const cwd = path.resolve(__dirname, '..');

function runModule(source, env) {
  return execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', source],
    {cwd, env, encoding: 'utf8'},
  );
}

test('every hosted route owns its distinct cache header configuration', () => {
  runModule(
    `
      import assert from 'node:assert/strict';
      import {config} from './vercel.mjs';
      assert.equal(new Set(config.headers.map(rule => rule.headers)).size, 7);
      assert.equal(config.headers.find(rule => rule.source === '/api/:path*').headers[0].value, 'private, no-store');
      assert.equal(config.headers.find(rule => rule.source === '/sw.js').headers[0].value, 'no-cache');
    `,
    {
      ACCOUNT_API_BASE_URL: 'https://account.example/api',
      ADVICE_API_BASE_URL: 'https://advice.example',
    },
  );
});

test.each([
  ['development', 'http://127.0.0.1:5001/api', 'http://127.0.0.1:5002'],
  ['production', '/api', '/advice'],
])('web uses the correct service addresses in %s', (mode, account, advice) => {
  const result = runModule(
    `
      import {BACKEND_URL, AIBACKEND_URL} from './backendConfig.web.js';
      console.log(JSON.stringify([BACKEND_URL, AIBACKEND_URL]));
    `,
    {NODE_ENV: mode},
  );
  expect(JSON.parse(result)).toEqual([account, advice]);
});
