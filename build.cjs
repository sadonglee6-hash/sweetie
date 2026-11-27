const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const esbuild = require('esbuild');

const src = path.join(__dirname, 'src');
const read = name => fs.readFileSync(path.join(src, name), 'utf8');
function dataURL(name, type) {
  const bytes = fs.readFileSync(path.join(src, 'assets', name));
  return 'data:' + type + ';base64,' + bytes.toString('base64');
}

async function build() {
  const images = {};
  for (const file of fs.readdirSync(path.join(src, 'assets')).sort()) {
    if (file.endsWith('.webp')) images[file] = dataURL(file, 'image/webp');
  }
  const css = read('style.css').replace('./assets/atelier.woff2', () => dataURL('atelier.woff2', 'font/woff2'));
  const bundle = await esbuild.build({
    entryPoints: [path.join(src, 'app.js')],
    alias: { three: path.join(src, 'vendor/three.module.min.js') },
    bundle: true, write: false, minify: true, format: 'iife',
    platform: 'browser', target: ['safari16', 'chrome110'], legalComments: 'inline'
  });
  const credits = read('credits.html').match(/<h3>灵感摄影<\/h3>[\s\S]*?(?=<\/main>)/)[0];
  const script = [
    'window.SWEETIE_OFFLINE=true;',
    'window.SWEETIE_CREDITS=' + JSON.stringify(credits) + ';',
    'window.SWEETIE_ASSETS=' + JSON.stringify(images) + ';',
    bundle.outputFiles[0].text
  ].join('\n');
  const licenses = [read('vendor/LICENSE'), read('assets/FONT-LICENSE.txt')].join('\n').replace(/--/g, '—');
  const registration = "<script>if(location.protocol==='https:' && 'serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}</script>";
  const page = read('index.html')
    .replace(/<script type="importmap">.*?<\/script>/s, '')
    .replace('<link rel="stylesheet" href="./style.css">', () => '<style>' + css + '</style>')
    .replace('<script type="module" src="./app.js"></script>', () => '<script>' + script.replace(/<\/script/gi, '<\\/script') + '</script>' + registration)
    .replace('</body>', () => '<!--\n' + licenses + '\n-->\n</body>');
  const revision = createHash('sha256').update(page).digest('hex').slice(0, 20);
  const worker = fs.readFileSync(path.join(__dirname, 'offline-worker.template.js'), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'index.html'), page);
  fs.writeFileSync(path.join(__dirname, 'sw.js'), worker.replace('BUILD_REVISION', revision));
}
build().catch(error => { console.error(error); process.exitCode = 1; });
