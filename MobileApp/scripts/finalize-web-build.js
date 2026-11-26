const {createHash} = require('node:crypto');
const {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} = require('node:fs');
const path = require('node:path');

const dist = path.resolve(__dirname, '../dist');
const entryPath = path.join(dist, 'index.html');

function filesWithin(directory) {
  if (!existsSync(path.join(dist, directory))) {
    return [];
  }
  return readdirSync(path.join(dist, directory), {withFileTypes: true}).flatMap(
    entry => {
      const relativePath = path.posix.join(directory, entry.name);
      return entry.isDirectory() ? filesWithin(relativePath) : [relativePath];
    },
  );
}

const html = readFileSync(entryPath, 'utf8');
if (!html.includes('</body>')) {
  throw new Error('The web export did not produce a complete HTML entry.');
}
writeFileSync(
  entryPath,
  html.replace(
    '</body>',
    '<script defer src="/offline-startup.js"></script>\n</body>',
  ),
);
copyFileSync(
  path.join(__dirname, 'register-service-worker.js'),
  path.join(dist, 'offline-startup.js'),
);

const files = [
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'favicon.ico',
  'offline-startup.js',
  ...filesWithin('_expo/static'),
  ...filesWithin('assets'),
].filter(file => !file.endsWith('.map'));
const digest = createHash('sha256');
const worker = readFileSync(
  path.join(__dirname, 'service-worker.template.js'),
  'utf8',
);
digest.update(worker);
for (const file of files.sort()) {
  digest.update(file);
  digest.update(readFileSync(path.join(dist, file)));
}

const cache = `nila-shell-${digest.digest('hex').slice(0, 16)}`;
const urls = files.map(
  file => `/${encodeURI(file).replace(/#/g, '%23').replace(/\?/g, '%3F')}`,
);
writeFileSync(
  path.join(dist, 'sw.js'),
  `const SHELL_CACHE = ${JSON.stringify(cache)};\n` +
    `const STATIC_ASSETS = ${JSON.stringify(urls)};\n${worker}`,
);
console.log(`Prepared ${files.length} files for offline startup.`);
