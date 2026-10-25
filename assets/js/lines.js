// Every top-level block of a post is a line. Sections are listed as Vim folds.
// Inlined right after the prose, so lines are marked before the first paint.
(() => {
  const prose = document.getElementById('prose');
  if (!prose) return;
  const blocks = [...prose.children].filter(el => el.textContent.trim() || el.querySelector('img, video'));
  blocks.forEach(el => el.classList.add('row', 'nav'));

  // The folds are in the HTML already; only their line counts are recounted here.
  blocks.filter(el => el.matches('h1, h2, h3')).forEach((h, i, heads) => {
    const lbl = document.querySelector(`#folds [data-target="${h.id}"] .lbl`);
    if (!lbl) return;
    const end = i + 1 < heads.length ? blocks.indexOf(heads[i + 1]) : blocks.length;
    const lines = end - blocks.indexOf(h);
    const title = [...h.childNodes].filter(n => !(n.classList && n.classList.contains('hash'))).map(n => n.textContent).join('').trim();
    lbl.textContent = `+--${String(lines).padStart(3, ' ')} lines: ${title}`;
  });
})();
