// :Tutor, the site's vimtutor. A lesson is done once every one of its steps has been typed, in any order.
const key = seq => e => e.kind === 'key' && e.value === seq;
const cmd = re => e => e.kind === 'cmd' && re.test(e.value);

const LESSONS = [
  {id: 'tutor-move', steps: [key('j'), key('k')]},
  {id: 'tutor-ends', steps: [key('gg'), key('G')]},
  {id: 'tutor-sections', steps: [key('zj'), key('zk')]},
  {id: 'tutor-search', steps: [e => e.kind === 'search' && e.value !== '', key('n')]},
  {id: 'tutor-yank', steps: [key('yy')]},
  {id: 'tutor-commands', steps: [cmd(/^se(?:t)? (?:bg|background)=(?:dark|light)$/)]},
  {id: 'tutor-quit', steps: [e => cmd(/^(?:q!|wq!?|x|qa!|wqa)$/)(e) || key('ZZ')(e) || key('ZQ')(e)]},
];
const STORE = 'tutor';

export function initTutor(ed) {
  const lessons = LESSONS.map((l, i) => ({...l, n: i + 1, head: document.getElementById(l.id), seen: new Set()})).filter(l => l.head);
  if (!lessons.length) return;

  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem(STORE)) || []); } catch {}

  const tick = l => {
    const mark = document.createElement('span');
    mark.className = 'done';
    mark.innerHTML = '<span aria-hidden="true">✓</span><span class="sr-only">, done</span>';
    l.head.append(mark);
  };
  lessons.filter(l => done.has(l.id)).forEach(tick);
  if (done.size) ed.say(`Tutor: ${done.size} of ${lessons.length} lessons done`);

  let sayLater;
  ed.on(e => {
    for (const l of lessons) {
      if (done.has(l.id)) continue;
      l.steps.forEach((step, i) => { if (step(e)) l.seen.add(i); });
      if (l.seen.size < l.steps.length) continue;
      done.add(l.id);
      try { localStorage.setItem(STORE, JSON.stringify([...done])); } catch {}
      tick(l);
      ed.refresh();
      const left = lessons.length - done.size;
      // The key's own message shows first; the lesson's follows once it has been read.
      clearTimeout(sayLater);
      sayLater = setTimeout(() => ed.say(left
        ? `Lesson ${l.n} done. ${left} to go, zj for the next one.`
        : 'All lessons done. You know enough Vim to read this site.'), 1200);
    }
  });
}
