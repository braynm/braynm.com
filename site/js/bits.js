// The margins are a live `xxd -b` of whatever line the cursor is on.
const ROW_H = 18;
const FLIP = 900;
const GLOW = 160;
const enc = s => [...new TextEncoder().encode(s + '  ')];

export function createBits({canvas, strip, column, reduce}) {
  const C = {};
  let cur = enc(' ');
  let old = cur;
  let t0 = -1e9;
  let mx = -1e4;
  let my = -1e4;
  let sidesOn = null;

  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  const recolor = () => {
    const cs = getComputedStyle(document.documentElement);
    for (const k of ['dim', 'plum', 'teal']) C[k] = cs.getPropertyValue('--' + k).trim();
  };
  recolor();

  const set = s => {
    const next = enc(s || ' ');
    if (next.join() === cur.join()) return;
    old = cur;
    cur = next;
    t0 = performance.now();
  };

  const at = (arr, p) => arr[p % arr.length];

  const fit = (c, w, h) => {
    const dpr = devicePixelRatio || 1;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.font = '500 11px "Martian Mono", monospace';
    g.textBaseline = 'middle';
    g.cw = g.measureText('0').width;
    return g;
  };

  // Whole bytes are one fillText; only bytes that are flipping or under the cursor glow draw bit by bit.
  const drawByte = (g, now, p, x, y, alpha, delay, vis) => {
    const nb = at(cur, p);
    const ob = at(old, p);
    const dt = reduce ? FLIP : now - t0 - delay;
    const near = Math.hypot(x + g.cw * 4 - mx, y - my) < GLOW;
    if ((dt >= FLIP || nb === ob) && !near) {
      g.globalAlpha = alpha;
      g.fillStyle = C.dim;
      g.fillText(nb.toString(2).padStart(8, '0'), x, y);
      return dt >= 0 ? nb : ob;
    }
    for (let b = 0; b < 8; b++) {
      const bd = dt - b * 18;
      const nv = (nb >> (7 - b)) & 1;
      const ov = (ob >> (7 - b)) & 1;
      const cx = x + b * g.cw;
      const lit = Math.max(0, 1 - Math.hypot(cx - mx, y - my) / GLOW);
      const flash = nv !== ov && bd >= 0 && bd < FLIP ? 1 - bd / FLIP : 0;
      g.globalAlpha = Math.min(1, alpha + (lit * 0.7 + flash) * vis);
      g.fillStyle = flash > 0 ? C.plum : lit > 0.05 ? C.teal : C.dim;
      g.fillText(bd >= 0 ? nv : ov, cx, y);
    }
    return dt >= 0 ? nb : ob;
  };

  const sides = now => {
    const W = innerWidth;
    const H = innerHeight;
    const g = fit(canvas, W, H);
    const usable = column.getBoundingClientRect().left + 12;
    const n = Math.min(6, Math.floor((usable / g.cw - 9) / 9), Math.floor((usable / g.cw - 1) / 11));
    if (n < 1) return false;
    const drift = (reduce ? 0 : now / 1000 * 0.35) + scrollY * 0.25 / ROW_H;
    const first = Math.floor(drift);
    const yoff = -(drift - first) * ROW_H;
    const fadeH = H * 0.2;
    const bottom = H - 64;
    for (let r = 0; r * ROW_H + yoff < H; r++) {
      const y = yoff + r * ROW_H + ROW_H / 2;
      const av = Math.max(0, Math.min(1, (y - 8) / fadeH, (bottom - y) / fadeH));
      if (!av) continue;
      const base = (first + r) * 2 * n;
      const delay = (y / H) * 600;
      g.globalAlpha = av * 0.45;
      g.fillStyle = C.dim;
      g.fillText(base.toString(16).padStart(7, '0') + ':', 16, y);
      let ascii = '';
      for (let j = 0; j < 2 * n; j++) {
        const left = j < n;
        const d = left ? n - 1 - j : j - n;
        const fade = 0.18 + 0.82 * (n > 1 ? d / (n - 1) : 1);
        const x = left ? 16 + (9 + j * 9) * g.cw : W - 16 - (11 * n + 1) * g.cw + (j - n) * 9 * g.cw;
        const v = drawByte(g, now, base + j, x, y, av * fade * 0.38, delay + d * 30, av);
        ascii += v >= 32 && v < 127 ? String.fromCharCode(v) : '.';
      }
      g.globalAlpha = av * 0.55;
      g.fillStyle = C.dim;
      g.fillText(ascii, W - 16 - 2 * n * g.cw, y);
    }
    return true;
  };

  const drawStrip = now => {
    const w = strip.clientWidth;
    const h = strip.clientHeight;
    if (!w) return;
    const g = fit(strip, w, h);
    const n = Math.max(1, Math.floor(w / (9 * g.cw)));
    const drift = reduce ? 0 : now / 1000 * 0.35;
    const first = Math.floor(drift);
    const yoff = -(drift - first) * ROW_H;
    for (let r = 0; r * ROW_H + yoff < h; r++) {
      const y = yoff + r * ROW_H + ROW_H / 2;
      const av = Math.max(0, Math.min(1, y / 14, (h - y) / 14));
      for (let j = 0; j < n; j++) drawByte(g, now, (first + r) * n + j, j * 9 * g.cw, y, av * 0.6, j * 40, av);
    }
  };

  (function frame(now) {
    const on = sides(now);
    if (on !== sidesOn) {
      sidesOn = on;
      document.documentElement.classList.toggle('has-sides', on);
    }
    if (!on && strip) drawStrip(now);
    requestAnimationFrame(frame);
  })(performance.now());

  return {set, recolor};
}
