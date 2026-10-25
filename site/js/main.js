import {createBits} from './bits.js';
import {createEditor} from './editor.js';
import {startHero} from './hero.js';
import {preparePost, wirePost} from './post.js';
import {initNetrw} from './netrw.js';
import {initEaster} from './easter.js';
import {initAscii} from './ascii.js';
import {initViews} from './views.js';
import {initTutor} from './tutor.js';

const page = document.body.dataset.page;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDoc = page === 'post' || page === 'page';

if (isDoc) preparePost();

const bits = createBits({
  canvas: document.getElementById('bits'),
  strip: document.querySelector('.dump canvas'),
  column: document.querySelector('.buf'),
  reduce,
});
const canHover = matchMedia('(hover: hover)').matches;
const ed = createEditor({bits, reduce, follow: page === 'home' && canHover ? 'hover' : 'scroll'});
initEaster(ed, {reduce});
initViews(ed, {reduce});

if (page === 'home' && !canHover) ed.say('Tap : for commands or / to search.');

if (page === 'home') startHero({ed, reduce});
if (isDoc) {
  wirePost(ed);
  initAscii(ed);
  initTutor(ed);
}
if (page === 'list') initNetrw(ed);
