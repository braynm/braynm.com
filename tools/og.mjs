// Renders a 1200x630 share card for every page into images/og/.
// Run from the repo root after adding or renaming a post:  node tools/og.mjs
// Needs Node 22+ (built-in WebSocket) and Google Chrome. Set CHROME to override its path.
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, basename} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = resolve(import.meta.dirname, '..', 'site');
const chromePath = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const decode = s => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const pick = (html, re) => decode((html.match(re) || [])[1] || '').trim();

const pages = [];
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!['images', 'videos', 'css', 'js'].includes(name)) walk(p); }
    else if (name === 'index.html') pages.push(p);
  }
};
walk(root);

const cards = new Map();
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  const image = pick(html, /<meta property="og:image" content="[^"]*\/images\/og\/([^"]+)\.png"/);
  if (!image || cards.has(image)) continue;
  const date = pick(html, /<p class="info"><time datetime="([^"]+)"/);
  const info = pick(html, /<p class="info">([\s\S]*?)<\/p>/).replace(/<[^>]+>/g, '').replace(/&ensp;/g, '  ').replace(/\s{3,}/g, '   ');
  cards.set(image, {
    home: image === 'home',
    title: pick(html, /<meta property="og:title" content="([^"]*)"/),
    desc: pick(html, /<p class="excerpt"><span aria-hidden="true"># <\/span>([^<]*)<\/p>/) || pick(html, /<meta property="og:description" content="([^"]*)"/),
    file: pick(html, /<span class="file">([^<]*)<\/span>/),
    type: pick(html, /<span class="meta">utf-8 &nbsp; (\w+)/),
    meta: date ? info : '',
  });
}

const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(chromePath, [
  '--headless=new', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'og-'))}`, '--window-size=1200,630', 'about:blank',
], {stdio: 'ignore'});

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {}
}
if (!target) { chrome.kill(); throw new Error(`Chrome did not start: ${chromePath}`); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let id = 0;
const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); pending.get(m.id)?.(m.result); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({id: i, method, params})); });

await send('Emulation.setDeviceMetricsOverride', {width: 1200, height: 630, deviceScaleFactor: 1, mobile: false});
const template = pathToFileURL(join(import.meta.dirname, 'og.html')).href;
mkdirSync(join(root, 'images', 'og'), {recursive: true});

for (const [name, card] of cards) {
  await send('Page.navigate', {url: 'about:blank'});
  await send('Page.navigate', {url: `${template}#${encodeURIComponent(JSON.stringify(card))}`});
  for (let i = 0; i < 50; i++) {
    const r = await send('Runtime.evaluate', {expression: 'document.body && document.body.dataset.ready', returnByValue: true});
    if (r.result.value === '1') break;
    await sleep(100);
  }
  const {data} = await send('Page.captureScreenshot', {format: 'png'});
  const out = join(root, 'images', 'og', `${name}.png`);
  writeFileSync(out, Buffer.from(data, 'base64'));
  console.log('wrote', join('images', 'og', basename(out)), '|', card.title);
}

ws.close();
chrome.kill();
