// The page as a Vim buffer: rows, a cursor, a statusline, a command line.
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

  const srcOf = r => (r.dataset.text || r.textContent).replace(/\s+/g, ' ').trim().slice(0, 240);
  const setMode = m => { mode = m; modeEl.textContent = m; };
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
  };

  const refresh = () => {
    rows = [...document.querySelectorAll('#buf .row')];
    nav = rows.filter(r => r.classList.contains('nav'));
    cur = Math.max(0, Math.min(cur, nav.length - 1));
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
  const applyBg = (next, animate) => {
    bg = next;
    const go = () => {
      document.documentElement.dataset.theme = next;
      label();
      bits.recolor();
    };
    if (animate && !reduce && document.startViewTransition) document.startViewTransition(go);
    else go();
  };
  const setBg = next => {
    chosen = next;
    try { localStorage.setItem('bg', next); } catch {}
    applyBg(next, true);
    say(`:set background=${next}`);
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!chosen) applyBg(e.matches ? 'dark' : 'light', true);
  });
  toggle.addEventListener('click', () => setBg(bg === 'dark' ? 'light' : 'dark'));
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
    ['help', () => say('Try :set bg=dark  :writing  :about  :home  :42  :noh  :q, or /elixir then n')],
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
      const c = input.value.trim();
      setMode('NORMAL');
      say('');
      if (lead === '/') { search(c); jump(1); return; }
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
    setMode,
    say,
    refresh,
    place,
    mode: () => mode,
    cursorRow: () => nav[cur],
    indexOf: r => nav.indexOf(r),
  };
}
