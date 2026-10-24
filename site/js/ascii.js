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
function buildRamp(font) {
  const c = document.createElement('canvas');
  c.width = c.height = 40;
  const g = c.getContext('2d', {willReadFrequently: true});
  g.font = font.replace(/\d+px/, '32px');
  g.textBaseline = 'top';
  const cover = [...new Set(CHARS)].map(ch => {
    g.clearRect(0, 0, 40, 40);
    g.fillText(ch, 4, 2);
    const d = g.getImageData(0, 0, 40, 40).data;
    let a = 0;
    for (let i = 3; i < d.length; i += 4) a += d[i];
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
  const sg = s.getContext('2d', {willReadFrequently: true});
  sg.imageSmoothingQuality = 'high';
  sg.drawImage(img, 0, 0, sw, sh);
  const px = sg.getImageData(0, 0, sw, sh).data;
  const L = new Float32Array(sw * sh);
  for (let i = 0; i < L.length; i++) L[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
  const at = (x, y) => L[y * sw + x];

  const n = cols * rows;
  const tone = new Float32Array(n);
  const rgb = new Float32Array(n * 3);
  const mag = new Float32Array(n);
  const ang = new Float32Array(n);
  for (let c = 0; c < n; c++) {
    const x = c % cols;
    const y = Math.floor(c / cols);
    let best = 0;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const sx = x * 2 + dx;
        const sy = y * 2 + dy;
        const i = sy * sw + sx;
        tone[c] += L[i] / 4;
        rgb[c * 3] += px[i * 4] / 4;
        rgb[c * 3 + 1] += px[i * 4 + 1] / 4;
        rgb[c * 3 + 2] += px[i * 4 + 2] / 4;
        if (sx < 1 || sy < 1 || sx >= sw - 1 || sy >= sh - 1) continue;
        const gx = at(sx + 1, sy - 1) + 2 * at(sx + 1, sy) + at(sx + 1, sy + 1) - at(sx - 1, sy - 1) - 2 * at(sx - 1, sy) - at(sx - 1, sy + 1);
        const gy = at(sx - 1, sy + 1) + 2 * at(sx, sy + 1) + at(sx + 1, sy + 1) - at(sx - 1, sy - 1) - 2 * at(sx, sy - 1) - at(sx + 1, sy - 1);
        const m = Math.hypot(gx, gy);
        if (m > best) { best = m; ang[c] = Math.atan2(gy, gx); }
      }
    }
    mag[c] = best;
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
      g.fillStyle = `rgba(${rgb[c * 3] | 0},${rgb[c * 3 + 1] | 0},${rgb[c * 3 + 2] | 0},${opts.wash})`;
      g.fillRect((c % cols) * cw, Math.floor(c / cols) * lh, cw + 0.5, lh + 0.5);
    }
  }
  for (let c = 0; c < n; c++) {
    const lin = Math.min(1, Math.max(0, (tone[c] - lo) / (hi - lo || 1)));
    const t = 0.5 * rank(tone[c]) + 0.5 * lin;
    const v = dark ? t : 1 - t;
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
    const cv = document.createElement('canvas');
    cv.className = 'ascii';
    cv.setAttribute('aria-hidden', 'true');
    const flip = document.createElement('button');
    flip.type = 'button';
    flip.className = 'flip';
    flip.setAttribute('aria-label', 'Show the photo');
    flip.setAttribute('aria-pressed', 'false');
    img.replaceWith(flip);
    flip.append(cv, img);
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = 'Click the drawing to see the photo';
    fig.querySelector('figcaption')?.append(hint);

    const render = () => draw(fig, img, cv, opts);
    const ready = img.complete ? Promise.resolve() : new Promise(r => img.addEventListener('load', r, {once: true}));
    ready.then(render).then(() => {
      fig.classList.add('drawn');
      new IntersectionObserver((entries, io) => {
        if (!entries[0].isIntersecting) return;
        cv.classList.add('printing');
        io.disconnect();
      }, {threshold: 0.25}).observe(fig);
    });

    flip.addEventListener('click', () => {
      const on = fig.classList.toggle('revealed');
      flip.setAttribute('aria-pressed', String(on));
      flip.setAttribute('aria-label', on ? 'Show the drawing' : 'Show the photo');
      hint.textContent = on ? 'Click the photo to go back to the drawing' : 'Click the drawing to see the photo';
      ed.say(on ? `:r ${fig.dataset.text}` : `"${fig.dataset.text}" drawn in Vim commands`);
    });

    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 150); });
    new MutationObserver(render).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  });
}
