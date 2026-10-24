// The home headline rewrites itself with :s///, echoing the Vim substitute post.
const SUBS = ['Elixir', 'TypeScript', 'React', 'with AI', 'pure code', 'notes', 'Elixir'];
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function startHero({ed, reduce}) {
  const row = document.querySelector('.hero-row');
  const obj = document.getElementById('hero-obj');
  const cmd = document.getElementById('hero-cmd');
  if (!row || reduce) return;
  for (let i = 0; ; i = (i + 1) % (SUBS.length - 1)) {
    await wait(2200);
    const from = SUBS[i];
    const to = SUBS[i + 1];
    const text = `:s/${from}/${to}/`;
    const b = document.createElement('b');
    const caret = document.createElement('span');
    caret.className = 'caret';
    cmd.replaceChildren(b, caret);
    // While a command is typed the cursor lives on the command line, and returns to the text on Enter.
    row.classList.add('typing');
    for (let k = 1; k <= text.length; k++) {
      b.textContent = text.slice(0, k);
      // A typist's uneven rhythm, with a beat when incsearch finds the word.
      if (k === 3 + from.length) { obj.classList.add('hl-search'); await wait(180); }
      await wait(32 + Math.random() * 40);
    }
    await wait(350);
    row.classList.remove('typing');
    obj.classList.remove('hl-search');
    obj.textContent = to;
    obj.classList.add('hl-new');
    cmd.textContent = '1 substitution on 1 line';
    row.dataset.text = `Bryan Madrid writes ${to}`;
    if (ed.cursorRow() === row && ed.mode() === 'NORMAL') ed.refresh();
    await wait(900);
    obj.classList.remove('hl-new');
  }
}
