// Things only people who type into the command line will find.
export function initEaster(ed, {reduce}) {
  const answer = () => ed.say('42. Vim\'s help says only Douglas Adams knew the question.');
  ed.cmd('help 42', answer);
  ed.cmd('h 42', answer);
  ed.cmd('help holy-grail', () => ed.say('You found it, Arthur!'));
  ed.cmd('Ni!', () => ed.say('Do you demand a shrubbery?'));
  ed.cmd('help!', () => ed.say("E478: Don't panic!", true));
  ed.cmd('smile', smile);
  ed.cmd('smi', smile);
  ed.key('i', () => { ed.setMode('INSERT'); ed.say('-- INSERT --'); });

  const exit = () => exitVim(reduce);
  for (const c of ['q!', 'wq', 'wq!', 'x', 'qa!', 'wqa']) ed.cmd(c, exit);
  ed.key('ZZ', exit);
  ed.key('ZQ', exit);
}

// Vim's :smile, redrawn: the mouth is the tildes past the end of the buffer.
const FACE = `
          .ooOOOOOOOOoo.
       .oOO'          'OOo.
     .OO'                'OO.
    OO'    .@@.    .@@.    'OO
   OO      @@@@    @@@@      OO
  OO       '@@'    '@@'       OO
  OO                          OO
  OO    ~~              ~~    OO
   OO    '~~.        .~~'    OO
    OO.     '~~~~~~~~'     .OO
     'OO.                .OO'
       'OOo.          .oOO'
          'ooOOOOOOOOoo'`.slice(1);

// Like any long message in Vim, it waits at a hit-enter prompt. Enter, Escape or Space only
// dismiss it; any other key dismisses it and then does what it normally does.
function smile() {
  const cmdline = document.getElementById('cmdline');
  const more = document.createElement('div');
  more.className = 'more';
  const pre = document.createElement('pre');
  pre.setAttribute('role', 'img');
  pre.setAttribute('aria-label', 'A smiling face');
  pre.innerHTML = FACE.replace(/@+/g, '<span class="fn">$&</span>').replace(/~+/g, '<span class="kw">$&</span>');
  const prompt = document.createElement('span');
  prompt.className = 'fn';
  prompt.textContent = 'Press ENTER or type command to continue';
  more.append(pre, prompt);
  cmdline.replaceChildren(more);

  const done = () => {
    removeEventListener('keydown', onKey, true);
    removeEventListener('pointerdown', done, true);
    if (more.isConnected) {
      const msg = document.createElement('span');
      msg.className = 'msg';
      cmdline.replaceChildren(msg);
    }
  };
  const onKey = e => {
    if (!more.isConnected) return done();
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    done();
  };
  addEventListener('keydown', onKey, true);
  addEventListener('pointerdown', done, true);
}

// You actually exited Vim. The page repaints into the shell it was launched from.
function exitVim(reduce) {
  if (document.querySelector('.shell')) return;
  const last = document.activeElement;
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-modal', 'true');
  shell.setAttribute('aria-label', 'You exited Vim');
  shell.innerHTML = `
    <pre><span class="ps">bryan@braynm:~$</span> vim braynm.com
<span class="ps">bryan@braynm:~$</span> <span class="typed"></span><span class="caret" aria-hidden="true"></span></pre>
    <p class="note">You exited Vim. Developers ask the internet how to do that every single day.</p>
    <button type="button" class="reopen">vim braynm.com</button>`;
  document.body.append(shell);
  document.documentElement.classList.add('in-shell');
  const btn = shell.querySelector('.reopen');
  const typed = shell.querySelector('.typed');
  btn.focus();

  const close = () => {
    shell.remove();
    document.documentElement.classList.remove('in-shell');
    last?.focus?.();
  };
  btn.addEventListener('click', () => {
    if (reduce) return close();
    const text = 'vim braynm.com';
    let k = 0;
    const tick = setInterval(() => {
      typed.textContent = text.slice(0, ++k);
      if (k === text.length) { clearInterval(tick); setTimeout(close, 260); }
    }, 40);
  });
  shell.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}
