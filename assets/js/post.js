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
