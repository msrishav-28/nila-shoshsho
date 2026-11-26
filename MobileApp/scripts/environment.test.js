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

test('hosted account responses and offline startup use different cache policies', () => {
  runModule(
    `
      import assert from 'node:assert/strict';
      import {config} from './vercel.mjs';
      const cachePolicy = source => config.headers.find(
        rule => rule.source === source,
      )?.headers[0].value;
      for (const path of ['/', '/index.html', '/manifest.webmanifest', '/offline-startup.js', '/sw.js']) {
        assert.equal(cachePolicy(path), 'no-cache');
      }
      for (const path of ['/api/:path*', '/advice/:path*']) {
        assert.equal(cachePolicy(path), 'private, no-store');
      }
      assert.equal(cachePolicy('/assets/icon.png'), undefined);
    `,
    {},
  );
});

test('hosted API forwarding uses only the fixed production services', () => {
  runModule(
    `
      import assert from 'node:assert/strict';
      import {config} from './vercel.mjs';
      assert.deepEqual(config.rewrites, [
        {source: '/api/:path*', destination: 'https://nila-shoshsho-account-production.onrender.com/api/:path*'},
        {source: '/advice/:path*', destination: 'https://nila-shoshsho-advice-production.onrender.com/:path*'},
      ]);
    `,
    {},
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
