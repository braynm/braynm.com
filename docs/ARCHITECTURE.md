# braynm.com architecture

The site is static. Cloudflare Pages serves `site/` as it is, with no build step. Each page is a hand-maintained HTML file that loads one stylesheet and one JavaScript module. The JavaScript adds the Vim behavior on top of HTML that already reads correctly without it. For what visitors see, see `HOW-IT-WORKS.md`.

## Repository

```text
README.md, CLAUDE.md, docs/      in git, never served
tools/og.mjs, tools/og.html      renders the share cards into site/images/og/
site/                            everything Cloudflare publishes
  index.html                     home
  post/index.html                Writing page (netrw)
  post/<slug>/index.html         one folder per post
  about/index.html
  404.html                       served by Cloudflare for missing paths
  _redirects                     301s for posts that changed address
  css/style.css                  the whole stylesheet
  js/*.js                        ES modules, loaded from js/main.js
  images/, images/og/, videos/
  favicon.svg, favicon.ico, apple-touch-icon.png
```

Post addresses match the old Hugo site (`/post/search-and-replace-in-vim/`, `/post/my-first-post/`), so existing links keep working.

## A page

Every page has the same frame. Only the contents of `#buf` and the statusline text differ.

```text
<head>
  inline theme script ── sets <html data-theme> before first paint
  Google Fonts (Martian Mono, Literata), /css/style.css, og: meta
<body data-page="home | list | post | page">
  canvas#bits             fixed, full screen, behind everything: the binary margins
  div.redraw-edge         the cursor bar that rides view transitions; hidden otherwise
  header.top              ~/braynm.com  /post/<slug>.md      writing about github :set bg=…
  main#buf
    .buf                  the column; every .row inside is a line
      .row.nav …          lines the cursor can sit on
      .row …              lines that only get a number (tildes)
  .status                 fixed at the bottom
    .bar                  NORMAL │ : │ / │ ~/braynm.com/<file> │ utf-8 type 3:1 │ 42%
    #cmdline              messages, or the : and / input
  <script type="module" src="/js/main.js">
```

The theme script is inline and not deferred, so the page never paints in the wrong theme. With no saved choice it leaves the system setting in charge.

## JavaScript

`main.js` reads `body[data-page]` and wires the modules that page needs.

```text
                         main.js
                            │
        ┌───────────────────┼─────────────────────────┬──────────────┐
        ▼                   ▼                         ▼              ▼
   post.js            bits.js ◄──── set(text) ──── editor.js ──► easter.js
   preparePost()      createBits()                createEditor()   :q! shell, :help 42 …
   rows + folds       canvas#bits, .dump strip    rows, cursor,        │
        │                   ▲                     statusline,          │
        │                   │ recolor()           : / VISUAL, keys,    │
        ▼                   │                     :set bg ─────────────┘
   wirePost(ed)             │                          ▲    ▲
   ascii.js ────────────────┘ (theme change)           │    │
   drawings                                        hero.js  netrw.js
                                                   home     Writing page
```

The order matters. `preparePost()` runs before `createEditor()`, because it turns each block of a post into a line, and the editor collects the lines when it starts.

### Lines and the cursor

`editor.js` treats every `.row` inside `#buf` as a line, in document order, and `.row.nav` lines as places the cursor can be. On each cursor move it:

1. sets `data-ln` on every line; CSS draws it in the gutter with `::before`, as the line number for the cursor line and the distance for the rest. Screen readers skip it (`content: attr(data-ln) / ""`),
2. gives the cursor line the `cursor` class, and `tall` when it is over 110px high, so tall blocks highlight only the gutter, like Vim's `cursorlineopt=number`,
3. writes the position to the statusline,
4. sends the line's text to `bits.set()`: `data-text` if present, else its text content.

Each number sits on the baseline of its line's first text, or of the heading when the line has one. When lines are collected, after fonts load and after a resize, `editor.js` measures that baseline with a zero-size inline-block and stores the offset in `--ln-top`. Lines that start with a photo or video keep the number at the top. Never set `--ln-top` in CSS.

On the home page, on devices that can hover, the cursor follows the mouse. Everywhere else it follows scrolling: the cursor is the last line whose top is above 35% of the viewport. `j` and `k` scroll the new cursor line to that same 35% mark, so key moves and scroll-following agree. The attribute is `data-text`, never `data-src`: templating that treats `*src` as a URL percent-encodes it.

### Keys and commands

One `keydown` listener handles normal mode. It ignores keys with modifiers and keys typed into fields. Two-key sequences (`gg`, `zj`, `yy`, `ZZ`) wait up to a second for the second key. Other modules add keys and commands through `ed.key(seq, fn)` and `ed.cmd(name, fn)`; `netrw.js` adds `s` and `-`, and `easter.js` adds its commands.

`:` and `/` replace the command line's message with an input. Pressing `Enter` there calls `preventDefault()`. Without it the keypress continues and presses whatever the command just focused; that is how `:q!` once closed its own shell.

Search uses the CSS Custom Highlight API: matches are `Range`s painted with `::highlight(search)`, so the DOM is never changed. Case is ignored unless the query has a capital letter, like Vim's `smartcase`.

### The binary margins

`bits.js` draws on a fixed full-screen canvas every animation frame:

```text
bits.set(text) ── UTF-8 bytes of text, previous bytes kept with a timestamp
        │
frame ──┤ margin = left edge of .buf
        │ room for at least one byte?
        │   yes ─► side columns: offset, bytes, ASCII (right side), drifting with scroll
        │   no  ─► .dump strip under the title (html:not(.has-sides) shows it)
        ▼
per byte: unchanged and not near the mouse ─► one fillText of 8 bits
          otherwise ─► bit by bit: flipped bits flash plum, bits near the mouse glow teal
```

Every flash and glow is multiplied by the same vertical fade as the rest of the column, so nothing lights up in the faded corners. Colors are read from the CSS tokens and read again when the theme changes.

### Drawings

`ascii.js` replaces each `figure.photo img` with a button holding a canvas drawing and the image. The image stays in the HTML, so the photo shows when JavaScript does not run.

```text
image ─► sample at 2× the character grid
      ├─ per cell: average color, average brightness
      ├─ Sobel edges inside each cell ─► strongest 14% of cells drawn as | / - \
      ├─ brightness: half histogram equalization, half linear stretch
      └─ character chosen by measured ink coverage of ~70 Vim normal-mode characters
canvas: a 40% wash of each cell's color, then the character in that color, toned toward the ink color
```

The drawing re-renders when its width or the pixel density changes, and when the theme changes. Theme redraws are registered with `ed.onTheme(fn)`; the theme switch waits for them inside the view transition, so the repaint never captures a drawing in the old colors. Clicking toggles the `revealed` class, which swaps the drawing for the photo with the same repaint animation as the theme switch.

## Styling

`css/style.css` defines the palette as tokens on `:root`, with a `[data-theme="dark"]` override. Each color has a syntax role: plum for keywords, ochre for strings, teal for functions, dim for comments. Light is sage `#DCE3D3`; dark is `#182017`. Martian Mono sets everything except post prose, which is Literata. Every `clamp()` keeps a `rem` term so text follows browser zoom. Code blocks scroll instead of wrapping.

The theme switch and page-to-page navigation both use view transitions. `::view-transition-new(root)` reveals the new page top to bottom in steps, like a terminal redraw. Every page has a static `div.redraw-edge`, the cursor bar on the repaint's leading edge. It is `display: none` except under `:root:active-view-transition`, so it shows on theme switches and page loads alike; it must be in the HTML because `main.js` runs too late for a page load's first frame. It has its own `view-transition-name`, and its `sweep` keyframes use the same duration and step count as `redraw`, so the bar stays on the clip edge. Change both together.

The theme switch scans instead of wiping. It sets `data-redraw` to `down` (dark) or `up` (light), which turns off both CSS animations and makes the bar one band tall (`--bands`). Then, once the transition is ready, `editor.js` animates both pseudo-elements with the Web Animations API: 8 bands down the screen, each band printed left to right in 6 steps, 0.8s in all, with the bar's transform keyframes matching the clip-path keyframes. `up` runs the same scan from the bottom right. `BANDS`, `COLS` and `SCAN` in `editor.js` set the shape. It also sets `data-syntax-off="comment string keyword function"` inside the update callback; each name sets one token (`--dim`, `--ochre`, `--plum`, `--teal`) to `--ink` inside the header and `#buf`. Starting 180ms after the repaint ends, `editor.js` removes one name every 70ms, so the highlight groups get their colors back in order. Then the button's label changes by substitution, the way the home headline does. With reduced motion the switch is a 0.15s crossfade (`data-redraw="fade"`) with none of this.

The browser bar color comes from the `theme-color` meta tags, which only know the system theme. The inline theme script sets both to a saved choice before first paint, and the theme switch sets them when the repaint reaches the top of the screen. Cross-document transitions are inside `prefers-reduced-motion: no-preference`; browsers without support load pages normally.

## Share cards

`tools/og.mjs` walks `site/` for `index.html` files, reads each page's `og:image` name, title, excerpt, statusline path and date, and renders `tools/og.html` with that data in headless Chrome through the DevTools protocol. Each screenshot is saved as `site/images/og/<name>.png`. Pages that share a card name share the image.

## Adding a post

Copy `site/post/search-and-replace-in-vim/index.html` to `site/post/<slug>/index.html`, then:

1. Update `<title>`, `<meta name="description">`, the `og:` and canonical tags, the header crumb (`/post/<slug>.md`), the statusline file name and the command-line message (`"post/<slug>.md" NL, NB`).
2. In `.post-head`, update the date, read time, word count, `<h1 class="title">`, the excerpt, and `data-text` (the title).
3. Put the body in `#prose` as `p`, `ul`, `blockquote` and `h2`. Each heading needs an `id` and `<span class="hash" aria-hidden="true">## </span>`; the folds are built from the headings.
4. Code blocks use the `.code` wrapper: a `.code-bar` with `[lang]` and the `yy` button, around `<div class="highlight"><pre class="chroma"><code>`. Syntax classes are Chroma's short names (`k`, `s`, `nf`, `c`); plain text works too.
5. Videos use `figure.vid` with `preload="metadata"` and the file name as the caption. A `figure` never goes inside a `p`. A photo goes at the start of `.eof` as `figure.row.nav.photo` with `width`, `height`, `loading="lazy"` and the file name as the caption. Never give it the class `hero`; `h1.hero` is the home headline.
6. Update the `:bprev` and `:bnext` links on this post and its neighbors.
7. Add the post to the top of the writing list in `site/index.html`, and to `site/post/index.html` as an `li.entry` with `data-time` (Unix seconds), `data-name` and `data-size` (word count).
8. Run `node tools/og.mjs`.

If a post moves to a new address, add a line to `site/_redirects`.

## Checking a change

- Serve `site/` locally and load every page with the browser console open.
- At phone widths, compare `document.documentElement.scrollWidth` with `clientWidth` at 320, 360, 390 and 430 pixels using device emulation. A headless screenshot narrower than Chrome's minimum window width crops the right edge and looks like overflow when there is none.
- After changing shared CSS, check every page, not only the one you changed. A class name reused across pages once squeezed the home headline.
