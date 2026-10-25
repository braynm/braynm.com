// The posts page behaves like Vim's file browser: s cycles the sort, - goes up a directory.
const ORDERS = {
  time: (a, b) => b.dataset.time - a.dataset.time,
  name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
  size: (a, b) => b.dataset.size - a.dataset.size,
};

export function initNetrw(ed) {
  const list = document.getElementById('entries');
  const label = document.getElementById('sorted');
  if (!list) return;
  const names = Object.keys(ORDERS);
  let i = 0;
  ed.key('s', () => {
    i = (i + 1) % names.length;
    const by = names[i];
    [...list.querySelectorAll('.entry')].sort(ORDERS[by]).forEach(li => list.append(li));
    label.textContent = by;
    ed.refresh();
    ed.say(`Sorted by ${by}`);
  });
  ed.key('-', () => { location.href = '/'; });
}
