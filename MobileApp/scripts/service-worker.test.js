import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import path from 'node:path';

const origin = 'https://nila.example';
const entry = '/index.html';
const staticFile = '/_expo/static/app.js';
const current = 'nila-shell-current';
const old = 'nila-shell-old';
const worker = readFileSync(
  path.join(__dirname, 'service-worker.template.js'),
  'utf8',
);

function createWorker() {
  const listeners = {};
  const response = {body: 'app shell'};
  const cache = {
    addAll: jest.fn().mockResolvedValue(undefined),
    match: jest.fn().mockResolvedValue(response),
  };
  const caches = {
    open: jest.fn().mockResolvedValue(cache),
    keys: jest.fn().mockResolvedValue([old, 'another-app', current]),
    delete: jest.fn().mockResolvedValue(true),
  };
  const fetch = jest.fn().mockRejectedValue(new Error('offline'));
  const claim = jest.fn().mockResolvedValue(undefined);
  runInNewContext(worker, {
    SHELL_CACHE: current,
    STATIC_ASSETS: [entry, staticFile],
    URL,
    Request: jest.fn((url, options) => ({url, ...options})),
    fetch,
    caches,
    self: {
      location: {origin},
      clients: {claim},
      addEventListener: (event, handler) => {
        listeners[event] = handler;
      },
    },
  });

  const request = (pathName, options = {}) => {
    const respondWith = jest.fn();
    listeners.fetch({
      request: {
        url: new URL(pathName, origin).href,
        method: 'GET',
        headers: new Map(),
        ...options,
      },
      respondWith,
    });
    return respondWith;
  };

  return {cache, caches, claim, fetch, listeners, request, response};
}

test('preloads only static files using same-origin preview access', async () => {
  const {cache, listeners} = createWorker();
  const waitUntil = jest.fn();
  listeners.install({waitUntil});
  await waitUntil.mock.calls[0][0];

  expect(cache.addAll).toHaveBeenCalledWith(
    [entry, staticFile].map(url => ({
      url,
      cache: 'reload',
      credentials: 'same-origin',
      redirect: 'error',
    })),
  );
});

test('serves the cached entry when an offline launch cannot reach the host', async () => {
  const {request, response, cache} = createWorker();
  const respondWith = request('/', {mode: 'navigate'});

  await expect(respondWith.mock.calls[0][0]).resolves.toBe(response);
  expect(cache.match).toHaveBeenCalledWith(entry);
});

test('serves an exported static asset from the app-shell cache', async () => {
  const {request, response, fetch} = createWorker();
  const respondWith = request(staticFile);

  await expect(respondWith.mock.calls[0][0]).resolves.toBe(response);
  expect(fetch).not.toHaveBeenCalled();
});

test('leaves API traffic, writes, and cross-origin requests with the browser', () => {
  const {request, caches} = createWorker();

  expect(request('/api/auth/me')).not.toHaveBeenCalled();
  expect(request('/advice/market/insights')).not.toHaveBeenCalled();
  expect(request(entry, {method: 'POST'})).not.toHaveBeenCalled();
  expect(
    request(staticFile, {headers: new Map([['authorization', 'Bearer test']])}),
  ).not.toHaveBeenCalled();
  expect(request('https://another.example/index.html')).not.toHaveBeenCalled();
  expect(caches.open).not.toHaveBeenCalled();
});

test('activation removes only earlier Nila app-shell caches', async () => {
  const {listeners, caches, claim} = createWorker();
  const waitUntil = jest.fn();
  listeners.activate({waitUntil});
  await waitUntil.mock.calls[0][0];

  expect(caches.delete.mock.calls).toEqual([[old]]);
  expect(claim).toHaveBeenCalledTimes(1);
});
