// Post photos are drawn with characters that are all Vim normal-mode commands.
// Tone picks a character by how much ink it puts on screen, strong edges are traced
// with | / \ - in the edge's direction, and each character keeps the photo's own color
// over a faint wash of that color, which is what makes the drawing read as the photo.
const CHARS = " .'`^,:;-_~=+<>!?|/\\()[]{}*%#$@&0GgwbejkhlxpyuiorvnNWBEKHLXPYUIORVMm";
const EDGE = ['|', '/', '-', '\\'];
const LINE = 1.15;
const INK = {light: [30, 38, 28], dark: [211, 220, 198]};

let ramp;
// Measure each character's real coverage in Martian Mono once, then sort light to dark.
// All of them go on one canvas and are read back once: a willReadFrequently canvas, or a read per character,
// costs most of a second on a throttled phone. Each sits in a 40px cell with 8px between, so none bleeds into the next.
function buildRamp(font) {
  const chars = [...new Set(CHARS)];
  const c = document.createElement('canvas');
  c.width = chars.length * 48;
  c.height = 40;
  const g = c.getContext('2d');
  g.font = font.replace(/\d+px/, '32px');
  g.textBaseline = 'top';
  chars.forEach((ch, i) => g.fillText(ch, i * 48 + 4, 2));
  const d = g.getImageData(0, 0, c.width, 40).data;
  const cover = chars.map((ch, i) => {
    let a = 0;
    for (let y = 0; y < 40; y++) for (let x = i * 48; x < i * 48 + 40; x++) a += d[(y * c.width + x) * 4 + 3];
    return {ch, a};
  });
  const max = Math.max(...cover.map(c => c.a));
  return cover.map(c => ({ch: c.ch, v: c.a / max})).sort((x, y) => x.v - y.v);
}
const pick = v => {
  let lo = 0;
  let hi = ramp.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ramp[mid].v < v) lo = mid + 1; else hi = mid;
  }
  return ramp[lo].ch;
};

async function draw(fig, img, cv, opts) {
  const width = fig.clientWidth;
  if (!width || !img.naturalWidth) return;
  // A data-mask figure is a transparent picture (the About map): opacity is the tone, in either theme.
  const mask = 'mask' in fig.dataset;
  const size = width < 500 ? 6 : 8;
  const font = `600 ${size}px "Martian Mono"`;
  await document.fonts.load(font);
  ramp ||= buildRamp(font);

  const dpr = devicePixelRatio || 1;
  const g = cv.getContext('2d');
  g.font = font;
  const cw = g.measureText('M').width;
  const lh = size * LINE;
  const cols = Math.floor(width / cw);
  const rows = Math.round((width * img.naturalHeight / img.naturalWidth) / lh);

  // Sample at 2x per cell so edges can be measured inside each cell.
  const sw = cols * 2;
  const sh = rows * 2;
  const s = document.createElement('canvas');
  s.width = sw;
  s.height = sh;
  const sg = s.getContext('2d');
  sg.imageSmoothingQuality = 'high';
  sg.drawImage(img, 0, 0, sw, sh);
  const px = sg.getImageData(0, 0, sw, sh).data;
  const L = new Float32Array(sw * sh);
  for (let i = 0; i < L.length; i++) L[i] = mask ? px[i * 4 + 3] / 255 : (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
  const at = (x, y) => L[y * sw + x];

  const n = cols * rows;
  const tone = new Float32Array(n);
  const rgb = new Float32Array(n * 3);
  const cover = new Float32Array(n);
  const mag = new Float32Array(n);
  const ang = new Float32Array(n);
  for (let c = 0; c < n; c++) {
    const x = c % cols;
    const y = Math.floor(c / cols);
    let best = 0;
    let opaque = 0;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const sx = x * 2 + dx;
        const sy = y * 2 + dy;
        const i = sy * sw + sx;
        const a = px[i * 4 + 3];
        tone[c] += L[i] / 4;
        opaque += a;
        rgb[c * 3] += px[i * 4] * a;
        rgb[c * 3 + 1] += px[i * 4 + 1] * a;
        rgb[c * 3 + 2] += px[i * 4 + 2] * a;
        if (sx < 1 || sy < 1 || sx >= sw - 1 || sy >= sh - 1) continue;
        const gx = at(sx + 1, sy - 1) + 2 * at(sx + 1, sy) + at(sx + 1, sy + 1) - at(sx - 1, sy - 1) - 2 * at(sx - 1, sy) - at(sx - 1, sy + 1);
        const gy = at(sx - 1, sy + 1) + 2 * at(sx, sy + 1) + at(sx + 1, sy + 1) - at(sx - 1, sy - 1) - 2 * at(sx, sy - 1) - at(sx + 1, sy - 1);
        const m = Math.hypot(gx, gy);
        if (m > best) { best = m; ang[c] = Math.atan2(gy, gx); }
      }
    }
    mag[c] = best;
    // Color is averaged over the opaque part of the cell, so a coast is not darkened by the empty sea.
    cover[c] = opaque / (4 * 255);
    if (opaque) for (let k = 0; k < 3; k++) rgb[c * 3 + k] /= opaque;
  }

  // Half histogram equalization, half linear stretch: spreads tones without posterizing.
  const sorted = Float32Array.from(tone).sort();
  const lo = sorted[Math.floor(n * 0.01)];
  const hi = sorted[Math.floor(n * 0.99)];
  const rank = v => {
    let a = 0;
    let b = n - 1;
    while (a < b) {
      const m = (a + b) >> 1;
      if (sorted[m] < v) a = m + 1; else b = m;
    }
    return a / n;
  };
  const edgeCut = Float32Array.from(mag).sort()[Math.floor(n * 0.86)];

  const dark = document.documentElement.dataset.theme === 'dark';
  const ink = dark ? INK.dark : INK.light;
  cv.width = Math.round(cols * cw * dpr);
  cv.height = Math.round(rows * lh * dpr);
  cv.style.width = `${cols * cw}px`;
  cv.style.height = `${rows * lh}px`;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.font = font;
  g.textBaseline = 'top';
  if (opts.wash) {
    // A faint wash of the photo's own color behind each cell carries the shapes; the glyphs draw over it.
    for (let c = 0; c < n; c++) {
      g.fillStyle = `rgba(${rgb[c * 3] | 0},${rgb[c * 3 + 1] | 0},${rgb[c * 3 + 2] | 0},${opts.wash * cover[c]})`;
      g.fillRect((c % cols) * cw, Math.floor(c / cols) * lh, cw + 0.5, lh + 0.5);
    }
  }
  for (let c = 0; c < n; c++) {
    const lin = Math.min(1, Math.max(0, (tone[c] - lo) / (hi - lo || 1)));
    const t = 0.5 * rank(tone[c]) + 0.5 * lin;
    const v = mask ? tone[c] : dark ? t : 1 - t;
    if (v < 0.06) continue;
    let ch;
    if (opts.edges && mag[c] >= edgeCut && mag[c] > 0.35) {
      const a = ((ang[c] + Math.PI) % Math.PI) / Math.PI;
      ch = EDGE[Math.round(a * 4) % 4];
    } else {
      ch = pick(v);
    }
    if (ch === ' ') continue;
    let [r, gr, b] = ink;
    if (opts.color === 'true') {
      const k = dark ? 0.12 : opts.wash ? 0.45 : 0.3;
      r = rgb[c * 3] * (1 - k) + ink[0] * k;
      gr = rgb[c * 3 + 1] * (1 - k) + ink[1] * k;
      b = rgb[c * 3 + 2] * (1 - k) + ink[2] * k;
    }
    g.fillStyle = `rgb(${r | 0},${gr | 0},${b | 0})`;
    g.fillText(ch, (c % cols) * cw, Math.floor(c / cols) * lh);
  }
}

export function initAscii(ed, opts = {edges: true, color: 'true', wash: 0.4}, figs = document.querySelectorAll('figure.photo')) {
  figs.forEach(fig => {
    const img = fig.querySelector('img');
    // The About map stays a drawing: no button, no hint, nothing to flip to.
    const still = 'mask' in fig.dataset;
    const cv = document.createElement('canvas');
    cv.className = 'ascii';
    // Until the lazy photo loads, an undrawn canvas would sit at its default 300px, wider than a phone's column.
    cv.width = cv.height = 0;
    cv.setAttribute('aria-hidden', 'true');
    const flip = document.createElement(still ? 'span' : 'button');
    flip.className = 'flip';
    img.replaceWith(flip);
    flip.append(cv, img);

    let drawnAt = '';
    const at = () => `${fig.clientWidth}@${devicePixelRatio}`;
    const render = () => { drawnAt = at(); return draw(fig, img, cv, opts); };
    const ready = img.complete ? Promise.resolve() : new Promise(r => img.addEventListener('load', r, {once: true}));
    ready.then(render).then(() => {
      fig.classList.add('drawn');
      new IntersectionObserver((entries, io) => {
        if (!entries[0].isIntersecting) return;
        cv.classList.add('printing');
        io.disconnect();
      }, {threshold: 0.25}).observe(fig);
    });

    if (!still) {
      flip.type = 'button';
      flip.setAttribute('aria-label', 'Show the photo');
      flip.setAttribute('aria-pressed', 'false');
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = 'Click the drawing to see the photo';
      fig.querySelector('figcaption')?.append(hint);
      flip.addEventListener('click', () => {
        const on = fig.classList.toggle('revealed');
        flip.setAttribute('aria-pressed', String(on));
        flip.setAttribute('aria-label', on ? 'Show the drawing' : 'Show the photo');
        hint.textContent = on ? 'Click the photo to go back to the drawing' : 'Click the drawing to see the photo';
        ed.say(on ? `:r ${fig.dataset.text}` : `"${fig.dataset.text}" drawn in Vim commands`);
      });
    }

    // Phones fire resize when the address bar slides; only a new width or pixel density changes the drawing.
    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (at() !== drawnAt) render(); }, 150); });
    ed.onTheme(render);
  });
}
