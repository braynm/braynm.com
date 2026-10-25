// The page as a Vim buffer: rows, a cursor, a statusline, a command line.
import {decode, jobsFor} from './decode.js';

export function createEditor({bits, reduce, follow}) {
  const $ = id => document.getElementById(id);
  const modeEl = $('mode');
  const cmdline = $('cmdline');
  const posEl = $('pos');
  const pctEl = $('pct');

  let rows = [];
  let nav = [];
  let cur = 0;
  let mode = 'NORMAL';
  let scrollLock = 0;
  // Keys, commands and searches as they happen, for anything that teaches or reacts to them (:Tutor).
  const listeners = [];
  const emit = (kind, value) => listeners.forEach(fn => fn({kind, value}));

  const srcOf = r => (r.dataset.text || r.textContent).replace(/\s+/g, ' ').trim().slice(0, 240);
  // The mode colors the statusline badge and the cursor, the way airline does.
  const setMode = m => {
    mode = m;
    modeEl.textContent = m;
    document.documentElement.dataset.mode = m;
    caret();
  };
  const narrow = matchMedia('(max-width: 720px)');
  let sayTimer;
  const say = (text, err) => {
    const s = document.createElement('span');
    s.className = err ? 'msg err' : 'msg';
    s.textContent = text;
    cmdline.replaceChildren(s);
    clearTimeout(sayTimer);
    if (text && narrow.matches) sayTimer = setTimeout(() => { if (cmdline.firstChild === s) s.textContent = ''; }, 5000);
  };

  const render = () => {
    const ci = rows.indexOf(nav[cur]);
    rows.forEach((r, i) => {
      r.classList.toggle('cursor', i === ci);
      r.classList.toggle('tall', i === ci && r.offsetHeight > 110);
      r.dataset.ln = i === ci ? ci + 1 : Math.abs(i - ci);
    });
    posEl.textContent = `${ci + 1}:1`;
    if (mode === 'NORMAL') bits.set(srcOf(nav[cur]));
    if (nav[cur] !== pulsed) bits.pulse(pulsed = nav[cur]);
    caret();
  };
  let pulsed = null;

  // A block cursor on the cursor line's first character, blinking like gVim's. It is a highlight,
  // so the text is never touched. The home headline has its own cursor, and the command line takes it.
  let blink;
  const caret = () => {
    if (!window.CSS || !CSS.highlights) return;
    clearInterval(blink);
    CSS.highlights.delete('vcursor');
    const r = nav[cur];
    const t = r && (mode === 'NORMAL' || mode === 'INSERT') && !r.querySelector('.blk') && firstText(r);
    if (!t) return;
    const at = t.data.search(/\S/);
    const range = new Range();
    range.setStart(t, at);
    range.setEnd(t, at + 1);
    const hl = new Highlight(range);
    CSS.highlights.set('vcursor', hl);
    if (!reduce) blink = setInterval(() => { hl.size ? hl.clear() : hl.add(range); }, 530);
  };

  // Each line number sits on the baseline of its line's first text, whatever size that text is.
  // A zero-size inline-block's bottom edge is the baseline of the line it is on.
  const probe = () => {
    const p = document.createElement('span');
    p.style.cssText = 'display:inline-block;width:0;height:0';
    return p;
  };
  const firstText = r => {
    const walk = document.createTreeWalker(r.querySelector('h1, h2, h3') || r, NodeFilter.SHOW_ALL);
    for (let n; (n = walk.nextNode());) {
      if (n.nodeType === 1 && n.matches('img, video, canvas')) return null;
      if (n.nodeType === 3 && n.data.trim() && n.parentElement.getClientRects().length) return n;
    }
    return null;
  };
  const alignNumbers = () => {
    if (!rows.length) return;
    const g = getComputedStyle(rows[0], '::before');
    const gutter = document.createElement('div');
    gutter.style.cssText = `position:absolute;top:0;visibility:hidden;font:${g.fontWeight} ${g.fontSize}/${g.lineHeight} ${g.fontFamily}`;
    gutter.append(probe(), '0');
    document.body.append(gutter);
    const placed = rows.map(r => {
      const t = firstText(r);
      if (!t) return [r, null];
      const p = probe();
      t.before(p);
      return [r, p];
    });
    const lead = gutter.firstChild.getBoundingClientRect().bottom - gutter.getBoundingClientRect().top;
    for (const [r, p] of placed) {
      if (!p) { r.style.removeProperty('--ln-top'); continue; }
      r.style.setProperty('--ln-top', `${(p.getBoundingClientRect().bottom - r.getBoundingClientRect().top - lead).toFixed(1)}px`);
    }
    placed.forEach(([, p]) => p?.remove());
    gutter.remove();
  };

  const refresh = () => {
    rows = [...document.querySelectorAll('#buf .row')];
    nav = rows.filter(r => r.classList.contains('nav'));
    cur = Math.max(0, Math.min(cur, nav.length - 1));
    alignNumbers();
    render();
  };

  const place = (i, scroll) => {
    cur = Math.max(0, Math.min(nav.length - 1, i));
    render();
    if (!scroll) return;
    scrollLock = performance.now() + 800;
    const top = scrollY + nav[cur].getBoundingClientRect().top - innerHeight * 0.35;
    scrollTo({top, behavior: reduce ? 'auto' : 'smooth'});
  };

  const pct = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max <= 0 ? 0 : scrollY / max;
    pctEl.textContent = p < 0.01 ? 'Top' : p > 0.99 ? 'Bot' : Math.round(p * 100) + '%';
  };

  const followScroll = () => {
    if (performance.now() < scrollLock || mode !== 'NORMAL') return;
    const max = document.documentElement.scrollHeight - innerHeight;
    let i = 0;
    if (scrollY >= max - 2) i = nav.length - 1;
    else nav.forEach((r, k) => { if (r.getBoundingClientRect().top <= innerHeight * 0.35) i = k; });
    if (i !== cur) { cur = i; render(); }
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      pct();
      if (follow === 'scroll') followScroll();
    });
  }, {passive: true});

  refresh();
  document.fonts.ready.then(alignNumbers);
  let alignTimer;
  addEventListener('resize', () => { clearTimeout(alignTimer); alignTimer = setTimeout(alignNumbers, 150); });
  if (follow === 'hover') {
    nav.forEach(r => r.addEventListener('mouseenter', () => { if (mode === 'NORMAL') place(nav.indexOf(r), false); }));
  }

  // ---- / search, smartcase, painted with the CSS highlight API ----
  const find = {q: '', hits: [], i: -1};
  const paint = (name, ranges) => {
    if (!window.CSS || !CSS.highlights) return;
    if (ranges.length) CSS.highlights.set(name, new Highlight(...ranges));
    else CSS.highlights.delete(name);
  };
  const search = q => {
    find.q = q;
    find.hits = [];
    find.i = -1;
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), /[A-Z]/.test(q) ? 'g' : 'gi');
      const walk = document.createTreeWalker($('buf'), NodeFilter.SHOW_TEXT);
      for (let n; (n = walk.nextNode());) {
        for (const m of n.data.matchAll(re)) {
          const r = new Range();
          r.setStart(n, m.index);
          r.setEnd(n, m.index + m[0].length);
          find.hits.push(r);
        }
      }
    }
    paint('search', find.hits);
    paint('search-cur', []);
  };
  const jump = dir => {
    const {hits} = find;
    if (!find.q) return;
    if (!hits.length) return say(`E486: Pattern not found: ${find.q}`, true);
    let i = find.i;
    let wrapped = '';
    if (i < 0) {
      i = hits.findIndex(r => r.getBoundingClientRect().top > 60);
      if (i < 0) i = 0;
    } else {
      i += dir;
    }
    if (i >= hits.length) { i = 0; wrapped = 'search hit BOTTOM, continuing at TOP'; }
    if (i < 0) { i = hits.length - 1; wrapped = 'search hit TOP, continuing at BOTTOM'; }
    find.i = i;
    paint('search-cur', [hits[i]]);
    scrollBy({top: hits[i].getBoundingClientRect().top - innerHeight / 2, behavior: reduce ? 'auto' : 'smooth'});
    say(wrapped || `/${find.q}  [${i + 1}/${hits.length}]`);
  };

  // ---- :set background, the way Vim spells dark mode ----
  const toggle = $('bg-toggle');
  let chosen = null;
  try { chosen = localStorage.getItem('bg'); } catch {}
  let bg = document.documentElement.dataset.theme;
  const label = () => { toggle.textContent = `:set bg=${bg === 'dark' ? 'light' : 'dark'}`; };
  // Anything painted from the theme's colors redraws here, so the view transition waits for it
  // instead of capturing the old colors and popping to the new ones halfway through the repaint.
  const themed = [bits.recolor];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const root = document.documentElement;
  // The phone's browser bar takes the page color; the <meta> tags alone only follow the system theme.
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  const paintBar = () => {
    const c = getComputedStyle(root).getPropertyValue('--bg').trim();
    metas.forEach(m => { m.content = c; });
  };
  // The theme repaint scans like a raster: band by band down the screen, each band printed left to right
  // in steps, with the cursor bar riding the leading edge. Light runs the scan backwards, from the bottom right.
  const BANDS = 8;
  const COLS = 6;
  const SCAN = 800;
  root.style.setProperty('--bands', BANDS);
  const scan = up => {
    const clip = [];
    const edge = [];
    const pt = ([x, y]) => up ? `${100 - x}% ${100 - y}%` : `${x}% ${y}%`;
    for (let k = 0; k < BANDS; k++) {
      const y1 = k * 100 / BANDS;
      const y2 = (k + 1) * 100 / BANDS;
      const end = k + 1 < BANDS ? (k + 1) / BANDS - 1e-3 : 1;
      for (const [offset, x, easing] of [[k / BANDS, 0, `steps(${COLS}, start)`], [end, 100, 'linear']]) {
        clip.push({offset, easing, clipPath: `polygon(${[[0, 0], [100, 0], [100, y1], [x, y1], [x, y2], [0, y2]].map(pt).join(', ')})`});
        edge.push({offset, easing, transform: up ? `translate(${100 - x}%, ${(BANDS - 1 - k) * 100}%)` : `translate(${x - 100}%, ${k * 100}%)`});
      }
    }
    return {clip, edge};
  };
  // As the scan prints a band, the headings in it decode from hex, starting when the scan reaches them.
  let stopDecode = null;
  const decodeHeadings = up => {
    stopDecode?.();
    const jobs = [];
    for (const h of document.querySelectorAll('#buf :is(h1, h2, h3, .entry .t, .proj .t, .contact)')) {
      const box = h.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight) continue;
      const band = Math.min(BANDS - 1, Math.max(0, Math.floor(box.top / innerHeight * BANDS)));
      jobs.push(...jobsFor(h, (up ? BANDS - 1 - band : band) / BANDS * SCAN));
    }
    if (jobs.length) stopDecode = decode(jobs, () => { stopDecode = null; render(); });
  };
  // After the repaint, highlight groups come back one at a time, in the order a colorscheme sets them.
  const GROUPS = ['comment', 'string', 'keyword', 'function'];
  let repaint = null;
  // The button's label changes by substitution, the way the home headline does.
  const relabel = async t => {
    const from = toggle.textContent.replace(':set bg=', '');
    const to = bg === 'dark' ? 'light' : 'dark';
    const word = (cls, text) => Object.assign(document.createElement('span'), {className: cls, textContent: text});
    if (from === to) return label();
    toggle.replaceChildren(':set bg=', word('hl-search', from));
    await wait(260);
    if (repaint !== t) return label();
    toggle.replaceChildren(':set bg=', word('hl-new', to));
    await wait(700);
    if (repaint === t) label();
  };
  // Dark rolls down from the top and light rises from the bottom, painted in plain ink with the colors
  // arriving after. Reduced motion gets a short crossfade instead.
  const applyBg = (next, animate) => {
    bg = next;
    const go = () => {
      root.dataset.theme = next;
      return Promise.all(themed.map(fn => fn()));
    };
    if (!animate || !document.startViewTransition) { go(); label(); paintBar(); return; }
    const motion = reduce ? 'fade' : next === 'light' ? 'up' : 'down';
    root.dataset.redraw = motion;
    const t = repaint = document.startViewTransition(() => {
      if (motion !== 'fade') root.dataset.syntaxOff = GROUPS.join(' ');
      const drawn = go();
      if (motion === 'fade') label();
      // The browser bar changes when the repaint reaches the top of the screen.
      if (motion !== 'up') paintBar();
      return drawn;
    });
    if (motion !== 'fade') t.ready.then(() => {
      const {clip, edge} = scan(motion === 'up');
      root.animate(clip, {duration: SCAN, fill: 'both', pseudoElement: '::view-transition-new(root)'});
      root.animate(edge, {duration: SCAN, fill: 'both', pseudoElement: '::view-transition-new(redraw-edge)'});
      decodeHeadings(motion === 'up');
    }, () => {});
    t.finished.finally(async () => {
      if (repaint !== t) return;
      delete root.dataset.redraw;
      if (motion === 'fade') return;
      if (motion === 'up') paintBar();
      await wait(180);
      for (let i = 1; i <= GROUPS.length; i++) {
        if (repaint !== t) return;
        root.dataset.syntaxOff = GROUPS.slice(i).join(' ');
        await wait(70);
      }
      delete root.dataset.syntaxOff;
      await relabel(t);
    });
    return t.finished;
  };
  // keep: false shows a theme without making it the visitor's choice (the home headline's tour does).
  const setBg = (next, keep = true) => {
    if (keep) {
      chosen = next;
      try { localStorage.setItem('bg', next); } catch {}
    }
    say(`:set background=${next}`);
    return applyBg(next, true);
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!chosen) applyBg(e.matches ? 'dark' : 'light', true);
  });
  // The button types its own label into the command line, the way you would, then presses Enter.
  // Its bytes flip through the margins as they are typed, like a search query does.
  let busy = false;
  toggle.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    const next = bg === 'dark' ? 'light' : 'dark';
    if (!reduce) {
      setMode('COMMAND');
      const typed = document.createElement('span');
      const cmdCaret = document.createElement('span');
      cmdCaret.className = 'caret';
      cmdline.replaceChildren(typed, cmdCaret);
      for (const ch of `:set bg=${next}`) {
        typed.textContent += ch;
        bits.set(typed.textContent);
        await wait(18 + Math.random() * 24);
      }
      await wait(140);
      setMode('NORMAL');
    }
    await setBg(next)?.catch(() => {});
    busy = false;
  });
  label();

  // ---- : commands ----
  const go = href => () => { location.href = href; };
  const commands = new Map([
    ['writing', go('/post/')],
    ['Explore', go('/post/')],
    ['about', go('/about/')],
    ['home', go('/')],
    ['github', go('https://github.com/braynm')],
    ['mail', go('mailto:hi@braynm.com')],
    ['noh', () => { paint('search', []); paint('search-cur', []); }],
    ['Tutor', go('/tutor/')],
    ['help', () => say('Try :Tutor  :set bg=dark  :writing  :about  :42  :set list  :%!xxd  :q, or /elixir then n')],
    ['q', () => say('E37: No write since last change (add ! to override)', true)],
  ]);
  const patterns = [
    [/^se(?:t)? (?:bg|background)=(dark|light)$/, m => setBg(m[1])],
    [/^se(?:t)? (?:bg|background)\?$/, () => say(`  background=${bg}`)],
    [/^(\d+)$/, m => place(nav.indexOf(rows[Math.min(rows.length, +m[1]) - 1]) === -1 ? cur : nav.indexOf(rows[Math.min(rows.length, +m[1]) - 1]), true)],
  ];
  const run = c => {
    if (commands.has(c)) return commands.get(c)();
    for (const [re, fn] of patterns) {
      const m = c.match(re);
      if (m) return fn(m);
    }
    say(`E492: Not an editor command: ${c}`, true);
  };

  // On phones the keyboard covers fixed elements, so lift the statusline above it.
  const status = document.querySelector('.status');
  const vv = window.visualViewport;
  if (vv) {
    const lift = () => {
      const gap = innerHeight - vv.height - vv.offsetTop;
      status.style.transform = gap > 1 ? `translateY(${-gap}px)` : '';
    };
    vv.addEventListener('resize', lift);
    vv.addEventListener('scroll', lift);
  }

  const openCmd = lead => {
    setMode(lead === '/' ? 'SEARCH' : 'COMMAND');
    const input = document.createElement('input');
    input.setAttribute('aria-label', lead === '/' ? 'Search' : 'Command');
    input.autocomplete = 'off';
    input.spellcheck = false;
    cmdline.replaceChildren(lead, input);
    input.focus();
    if (lead === '/') input.addEventListener('input', () => { search(input.value); bits.set(input.value); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        setMode('NORMAL');
        say('');
        if (lead === '/') search('');
        render();
      }
      if (e.key !== 'Enter') return;
      // Consume Enter, or it carries on and presses whatever the command focused (the :q! shell's button).
      e.preventDefault();
      // Vim skips extra colons, so a pasted ":set bg=dark" still runs.
      const c = lead === '/' ? input.value.trim() : input.value.trim().replace(/^:+\s*/, '');
      setMode('NORMAL');
      say('');
      if (lead === '/') { search(c); jump(1); emit('search', c); return; }
      emit('cmd', c);
      run(c);
    });
    input.addEventListener('blur', () => { if (mode !== 'NORMAL') { setMode('NORMAL'); render(); } });
  };

  // ---- normal-mode keys, including two-key sequences like gg and zj ----
  const keys = new Map();
  const key = (seq, fn) => keys.set(seq, fn);
  const headingRows = () => nav.filter(r => r.matches('h1, h2, h3') || r.previousElementSibling?.classList.contains('helphead'));
  const yank = () => {
    const r = nav[cur];
    const code = r.querySelector('pre');
    const text = code ? code.innerText : r.innerText;
    const n = text.trimEnd().split('\n').length;
    navigator.clipboard?.writeText(text).then(
      () => say(`${n} line${n > 1 ? 's' : ''} yanked`),
      () => say('E353: Nothing in register "', true),
    );
  };
  key('j', () => place(cur + 1, true));
  key('k', () => place(cur - 1, true));
  key('gg', () => place(0, true));
  key('G', () => place(nav.length - 1, true));
  key('n', () => jump(1));
  key('N', () => jump(-1));
  key('zj', () => { const h = headingRows().find(r => nav.indexOf(r) > cur); if (h) place(nav.indexOf(h), true); });
  key('zk', () => { const h = headingRows().reverse().find(r => nav.indexOf(r) < cur); if (h) place(nav.indexOf(h), true); });
  key('yy', yank);

  document.querySelectorAll('.status .key').forEach(b => b.addEventListener('click', () => openCmd(b.dataset.key)));

  let pending = '';
  let pendingTimer;
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable], .shell')) return;
    if (mode === 'INSERT') {
      if (e.key === 'Escape') { setMode('NORMAL'); say(''); render(); }
      else if (e.key.length === 1) { e.preventDefault(); say("E21: Cannot make changes, 'modifiable' is off", true); }
      return;
    }
    if (e.key === ':' || e.key === '/') {
      e.preventDefault();
      openCmd(e.key);
      return;
    }
    if (e.key === 'Enter' && (document.activeElement === document.body || !document.activeElement)) {
      const r = nav[cur];
      const a = r.matches('a, button') ? r : r.querySelector('a, button');
      if (a) a.click();
      return;
    }
    if (e.key.length !== 1) return;
    const seq = pending + e.key;
    clearTimeout(pendingTimer);
    if (keys.has(seq)) {
      pending = '';
      e.preventDefault();
      keys.get(seq)();
      emit('key', seq);
    } else if ([...keys.keys()].some(k => k.startsWith(seq))) {
      pending = seq;
      pendingTimer = setTimeout(() => { pending = ''; }, 1000);
    } else {
      pending = '';
    }
  });

  // ---- selecting text is VISUAL mode, and the selection goes into the dump ----
  document.addEventListener('selectionchange', () => {
    if (mode === 'SEARCH' || mode === 'COMMAND') return;
    const sel = getSelection();
    const s = sel.toString();
    if (s && $('buf').contains(sel.anchorNode)) {
      setMode('VISUAL');
      say(`-- VISUAL --  ${s.length} chars, ${new TextEncoder().encode(s).length} bytes`);
      bits.set(s.slice(0, 240));
    } else if (mode === 'VISUAL') {
      setMode('NORMAL');
      say('');
      render();
    }
  });

  pct();
  if (follow === 'scroll') followScroll();
  const first = cmdline.querySelector('.msg');
  if (first && narrow.matches) say(first.textContent);

  return {
    key,
    cmd: (name, fn) => commands.set(name, fn),
    on: fn => listeners.push(fn),
    run: c => { say(''); emit('cmd', c); run(c); },
    press: seq => { keys.get(seq)?.(); emit('key', seq); },
    setBg,
    theme: () => bg,
    onTheme: fn => themed.push(fn),
    setMode,
    say,
    refresh,
    place,
    mode: () => mode,
    cursorRow: () => nav[cur],
    indexOf: r => nav.indexOf(r),
  };
}
