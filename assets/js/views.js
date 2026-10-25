// Other ways to look at the buffer: :set list shows the whitespace, :%!xxd filters the buffer through a hex dump.
const DOT = '·';
const EOL = '¬';
// A space is where a line may wrap; the dot that replaces it keeps that with a zero-width space.
const SPACE = DOT + '​';

const lines = () => [...document.querySelectorAll('#buf .row:not(.tilde)')];
const current = () => document.querySelector('#buf > .buf');
const isPre = el => getComputedStyle(el).whiteSpace.startsWith('pre');
const isInline = el => getComputedStyle(el).display.startsWith('inline');

const texts = root => {
  const out = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) if (/\S/.test(n.data) || n.parentElement.closest('pre')) out.push(n);
  return out;
};

// Whitespace at the edge of a text node only shows when inline text carries on past that edge.
const carriesOn = (node, row, side) => {
  let n = node;
  while (!n[side]) {
    n = n.parentElement;
    if (!n || n === row || !isInline(n)) return false;
  }
  const s = n[side];
  if (s.nodeType === 3) return /\S/.test(s.data);
  return s.nodeType === 1 && isInline(s) && /\S/.test(s.textContent);
};

const blockOf = (node, row) => {
  let el = node.parentElement;
  while (el !== row && isInline(el)) el = el.parentElement;
  return el;
};

function createList(ed) {
  let on = false;
  const saved = new Map();
  const marks = [];

  const show = () => {
    const ranges = [];
    for (const row of lines()) {
      const last = new Map();
      for (const t of texts(row)) {
        const d = t.data;
        let next;
        if (isPre(t.parentElement)) {
          next = d.replace(/ /g, DOT).replace(/\n/g, EOL + '\n');
        } else {
          next = d.replace(/(\S)\s+(?=\S)/g, `$1${SPACE}`)
            .replace(/^\s+/, m => carriesOn(t, row, 'previousSibling') ? SPACE : m)
            .replace(/\s+$/, m => carriesOn(t, row, 'nextSibling') ? SPACE : m);
        }
        if (!t.parentElement.closest('pre') && /\S/.test(d)) last.set(blockOf(t, row), t);
        if (next === d) continue;
        saved.set(t, d);
        t.data = next;
        for (const m of next.matchAll(/[·¬]/g)) {
          const r = new Range();
          r.setStart(t, m.index);
          r.setEnd(t, m.index + 1);
          ranges.push(r);
        }
      }
      for (const t of last.values()) {
        const eol = document.createElement('span');
        eol.className = 'eol';
        eol.setAttribute('aria-hidden', 'true');
        eol.textContent = EOL;
        t.after(eol);
        marks.push(eol);
      }
    }
    if (window.CSS && CSS.highlights) CSS.highlights.set('list', new Highlight(...ranges));
  };

  const hide = () => {
    for (const [t, d] of saved) t.data = d;
    saved.clear();
    marks.splice(0).forEach(m => m.remove());
    if (window.CSS && CSS.highlights) CSS.highlights.delete('list');
  };

  const set = next => {
    if (next === on) return;
    on = next;
    if (on) show(); else hide();
    ed.refresh();
  };

  for (const p of ['set', 'se']) {
    ed.cmd(`${p} list`, () => set(true));
    ed.cmd(`${p} nolist`, () => set(false));
    ed.cmd(`${p} list!`, () => set(!on));
    ed.cmd(`${p} invlist`, () => set(!on));
    ed.cmd(`${p} list?`, () => ed.say(on ? '  list' : 'nolist'));
  }
  return {set, on: () => on};
}

// xxd's own layout: offset, two-byte hex groups, then the bytes as text.
const hexLines = (bytes, cols) => {
  const out = [];
  const width = cols / 2 * 5 - 1;
  for (let o = 0; o < bytes.length; o += cols) {
    const chunk = bytes.subarray(o, o + cols);
    const groups = [];
    for (let i = 0; i < chunk.length; i += 2) groups.push([...chunk.subarray(i, i + 2)].map(b => b.toString(16).padStart(2, '0')).join(''));
    out.push({
      off: o.toString(16).padStart(8, '0') + ':',
      hex: groups.join(' ').padEnd(width),
      text: [...chunk].map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join(''),
    });
  }
  return out;
};

const lineText = r => {
  const pre = r.querySelector('pre');
  return (pre ? pre.textContent.replace(/\n$/, '') : r.innerText.trim() || r.dataset.text || '').trimEnd();
};

function createFilter(ed, list, reduce) {
  // Each filter pushes the buffer it replaced; u and :%!xxd -r pop it back, like Vim's undo.
  const undo = [];
  const root = document.documentElement;
  const file = document.querySelector('.status .file');
  const meta = document.querySelector('.status .meta').firstChild;
  const fileName = file.textContent;
  const metaText = meta.data;

  const status = () => {
    file.textContent = undo.length ? `${fileName} [+]` : fileName;
    meta.data = current().classList.contains('xxd') ? metaText.replace(/\S+(?=\s*$)/, 'xxd') : metaText;
  };

  // Swaps buffers inside a view transition, so the new one repaints top to bottom like :e does.
  const swap = fn => {
    const wasList = list.on();
    list.set(false);
    const run = () => {
      fn();
      scrollTo(0, 0);
      ed.refresh();
      ed.place(0, false);
      status();
      if (wasList) list.set(true);
    };
    if (!document.startViewTransition) return run();
    if (reduce) root.dataset.redraw = 'fade';
    document.startViewTransition(run).finished.finally(() => { if (reduce) delete root.dataset.redraw; });
  };

  const xxd = () => {
    const from = current();
    const text = lines().map(lineText).join('\n') + '\n';
    const count = text.split('\n').length - 1;
    const bytes = new TextEncoder().encode(text);
    swap(() => {
      const buf = document.createElement('div');
      buf.className = 'buf xxd';
      from.replaceWith(buf);
      const probe = document.createElement('div');
      probe.className = 'row';
      const digits = document.createElement('span');
      digits.textContent = '0'.repeat(10);
      probe.append(digits);
      buf.append(probe);
      const room = probe.clientWidth / (digits.getBoundingClientRect().width / 10);
      probe.remove();
      const cols = [16, 8, 4].find(c => 10 + c / 2 * 5 - 1 + 2 + c <= room) || 4;
      for (const {off, hex, text: t} of hexLines(bytes, cols)) {
        const row = document.createElement('div');
        row.className = 'row nav';
        row.dataset.text = t;
        const o = Object.assign(document.createElement('span'), {className: 'comment', textContent: off});
        const s = Object.assign(document.createElement('span'), {className: 'str', textContent: t});
        row.append(o, ` ${hex}  `, s);
        buf.append(row);
      }
      undo.push({buf: from, at: Date.now()});
    });
    ed.say(`${count} lines filtered`);
  };

  const ago = at => {
    const s = Math.round((Date.now() - at) / 1000);
    return s < 100 ? `${s} second${s === 1 ? '' : 's'} ago` : new Date(at).toLocaleTimeString('en-GB');
  };

  const restore = how => {
    const {buf, at} = undo.pop();
    const before = lines().length;
    const after = buf.querySelectorAll('.row:not(.tilde)').length;
    swap(() => current().replaceWith(buf));
    const diff = Math.abs(after - before);
    if (how === 'filter') return ed.say(`${before} lines filtered`);
    ed.say(`${diff} ${after < before ? 'fewer' : 'more'} line${diff === 1 ? '' : 's'}; before #${undo.length + 1}  ${ago(at)}`);
  };

  ed.cmd('%!xxd', xxd);
  ed.cmd('%!xxd -r', () => {
    if (!current().classList.contains('xxd')) return ed.say('xxd: this buffer is not a hex dump', true);
    restore('filter');
  });
  ed.key('u', () => undo.length ? restore('undo') : ed.say('Already at oldest change'));
}

// :Limelight, after the plugin: every line but the cursor's fades, for reading one paragraph at a time.
function createLimelight(ed) {
  const root = document.documentElement;
  const set = on => root.classList.toggle('limelight', on);
  ed.cmd('Limelight', () => set(true));
  ed.cmd('Limelight!', () => set(false));
  ed.cmd('Limelight!!', () => set(!root.classList.contains('limelight')));
}

export function initViews(ed, {reduce}) {
  const list = createList(ed);
  createFilter(ed, list, reduce);
  createLimelight(ed);
}
