// Every top-level block of a post is a line. Sections are listed as Vim folds.
export function preparePost() {
  const prose = document.getElementById('prose');
  if (!prose) return;
  const blocks = [...prose.children].filter(el => el.textContent.trim() || el.querySelector('img, video'));
  blocks.forEach(el => el.classList.add('row', 'nav'));

  const heads = blocks.filter(el => el.matches('h1, h2, h3'));
  const folds = document.getElementById('folds');
  if (!folds || heads.length < 2) return;
  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? blocks.indexOf(heads[i + 1]) : blocks.length;
    const lines = end - blocks.indexOf(h);
    const title = [...h.childNodes].filter(n => !(n.classList && n.classList.contains('hash'))).map(n => n.textContent).join('').trim();
    const a = document.createElement('a');
    a.className = 'fold';
    a.href = `#${h.id}`;
    a.dataset.target = h.id;
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = `+--${String(lines).padStart(3, ' ')} lines: ${title}`;
    const lead = document.createElement('span');
    lead.className = 'lead';
    lead.setAttribute('aria-hidden', 'true');
    a.append(lbl, lead);
    folds.append(a);
  });
}

export function wirePost(ed) {
  document.querySelectorAll('.fold').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.getElementById(a.dataset.target);
    history.replaceState(null, '', a.getAttribute('href'));
    ed.place(ed.indexOf(target), true);
  }));

  document.querySelectorAll('.code .yank').forEach(btn => btn.addEventListener('click', () => {
    const text = btn.closest('.code').querySelector('pre').innerText;
    const n = text.trimEnd().split('\n').length;
    navigator.clipboard?.writeText(text).then(
      () => ed.say(`${n} line${n > 1 ? 's' : ''} yanked`),
      () => ed.say('E353: Nothing in register "', true),
    );
  }));

  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && ed.indexOf(target) >= 0) ed.place(ed.indexOf(target), false);
  }
}
