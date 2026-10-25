// The home headline rewrites itself with :s///, echoing the Vim substitute post. Every third round, while the
// visitor sits idle at the top of the page, it runs one of the site's own commands instead and then undoes it,
// so the editor shows what it can do without anyone typing.
import {decode, jobsFor} from './decode.js';
import {nextScheme} from './editor.js';

const SUBS = ['Elixir', 'TypeScript', 'React', 'with AI', 'pure code', 'notes', 'Elixir'];
const other = ed => ed.theme() === 'dark' ? 'light' : 'dark';
// Each stop runs its command and returns the undo, which only acts if the visitor has not undone it already.
const TOUR = [
  {cmd: () => 'set list', hold: 2600, run: ed => { ed.run('set list'); return () => ed.run('set nolist'); }},
  {cmd: () => 'Limelight', hold: 2600, run: ed => { ed.run('Limelight'); return () => ed.run('Limelight!'); }},
  {cmd: () => '%!xxd', hold: 2400, run: ed => {
    ed.run('%!xxd');
    return () => { if (document.querySelector('.buf.xxd')) ed.press('u'); };
  }},
  {cmd: ed => `set bg=${other(ed)}`, hold: 3200, run: ed => {
    const was = ed.theme();
    const to = other(ed);
    ed.setBg(to, false);
    return () => { if (ed.theme() === to) ed.setBg(was, false); };
  }},
  {cmd: ed => `colorscheme ${nextScheme(ed.scheme())}`, hold: 3200, run: ed => {
    const was = ed.scheme();
    const to = nextScheme(was);
    ed.setScheme(to, false);
    return () => { if (ed.scheme() === to) ed.setScheme(was, false); };
  }},
];
const IDLE = 4000;
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function startHero({ed, reduce}) {
  const row = document.querySelector('.hero-row');
  const obj = document.getElementById('hero-obj');
  const cmd = document.getElementById('hero-cmd');
  if (!row || reduce) return;

  // The first time the home page opens in a visit, the headline decodes out of the margins' hex.
  let first = false;
  try { first = !sessionStorage.getItem('decoded'); sessionStorage.setItem('decoded', '1'); } catch {}
  if (first) decode([...row.querySelectorAll('.sub')].flatMap((line, i) => jobsFor(line, i * 140)));

  let lastInput = performance.now();
  for (const type of ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart']) {
    addEventListener(type, () => { lastInput = performance.now(); }, {passive: true});
  }
  const root = document.documentElement;
  const free = () => scrollY < 40 && document.visibilityState === 'visible' && ed.mode() === 'NORMAL'
    && performance.now() - lastInput > IDLE && !document.querySelector('.shell, .buf.xxd, .eol')
    && !root.classList.contains('limelight') && !root.dataset.redraw;

  // beat(k) may pause after the k-th character, the way a typist does when incsearch finds the word.
  const type = async (text, beat) => {
    const b = document.createElement('b');
    const caret = document.createElement('span');
    caret.className = 'caret';
    cmd.replaceChildren(b, caret);
    // While a command is typed the cursor lives on the command line, and returns to the text on Enter.
    row.classList.add('typing');
    for (let k = 1; k <= text.length; k++) {
      b.textContent = text.slice(0, k);
      await beat?.(k);
      await wait(32 + Math.random() * 40);
    }
    await wait(350);
    row.classList.remove('typing');
  };

  const substitute = async (from, to) => {
    await type(`:s/${from}/${to}/`, async k => {
      if (k === 3 + from.length) { obj.classList.add('hl-search'); await wait(180); }
    });
    obj.classList.remove('hl-search');
    obj.textContent = to;
    obj.classList.add('hl-new');
    cmd.textContent = '1 substitution on 1 line';
    row.dataset.text = `Bryan Madrid writes ${to}`;
    if (ed.cursorRow() === row && ed.mode() === 'NORMAL') ed.refresh();
    await wait(900);
    obj.classList.remove('hl-new');
  };

  const tour = async stop => {
    const text = stop.cmd(ed);
    await type(`:${text}`);
    if (!free()) { cmd.textContent = ''; return; }
    // The statusline's own message (the key hint) comes back once the command is undone.
    const cmdline = document.getElementById('cmdline');
    const hint = cmdline.textContent;
    const undo = stop.run(ed);
    cmd.textContent = cmdline.textContent;
    await wait(stop.hold);
    undo();
    await wait(600);
    cmd.textContent = '';
    if (!cmdline.querySelector('input')) ed.say(hint);
  };

  for (let round = 0, i = 0, t = 0; ; round++) {
    await wait(2200);
    if (round % 3 === 2 && free()) {
      await tour(TOUR[t]);
      t = (t + 1) % TOUR.length;
      continue;
    }
    await substitute(SUBS[i], SUBS[i + 1]);
    i = (i + 1) % (SUBS.length - 1);
  }
}
