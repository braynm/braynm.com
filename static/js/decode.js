// Text that flips through hex bytes, like the dump in the margins, and settles left to right.
// Only letters and digits flip, so spaces and punctuation hold the shape. Use it on monospaced
// text only, so nothing reflows.
const HEX = '0123456789abcdef';
const glyph = /[\p{L}\p{N}]/u;
export const DECODE = 450;

// Every text node under el that has something to flip, each starting `start` ms in.
export const jobsFor = (el, start) => {
  const jobs = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    if (glyph.test(n.data) && !n.parentElement.closest('.x')) jobs.push({node: n, chars: [...n.data], start});
  }
  return jobs;
};

// Runs the jobs and returns stop(), which settles every node at once. onDone runs once, either way.
export function decode(jobs, onDone) {
  const t0 = performance.now();
  let tick;
  const stop = () => {
    clearInterval(tick);
    jobs.forEach(j => { j.node.data = j.chars.join(''); });
    jobs = [];
    onDone?.();
    onDone = null;
  };
  tick = setInterval(() => {
    const now = performance.now() - t0;
    let busy = false;
    for (const j of jobs) {
      const done = (now - j.start) / DECODE;
      if (done >= 1) { j.node.data = j.chars.join(''); continue; }
      busy = true;
      j.node.data = j.chars.map((c, i) => i / j.chars.length < done || !glyph.test(c) ? c : HEX[Math.random() * 16 | 0]).join('');
    }
    if (!busy) stop();
  }, 45);
  return stop;
}
