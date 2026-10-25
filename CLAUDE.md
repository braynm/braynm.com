# braynm.com

Hugo builds the site from `content/` (Markdown), `layouts/` (templates), `assets/` (CSS and ES modules, fingerprinted) and `static/` (fonts, images, videos) into `site/`, which is committed. Cloudflare serves `site/` as it is and never runs Hugo; nothing else in this repository is published. Never edit `site/` by hand: change the sources, run `hugo`, and commit the sources and `site/` together. Run `tools/publish.sh` instead when a title or excerpt changes, so the share cards are redrawn.

- What visitors see: `docs/HOW-IT-WORKS.md`
- How it is built, and the steps to add a post: `docs/ARCHITECTURE.md`
- Run, deploy, share cards: `README.md`

## Rules that encode bugs already hit

- Code never wraps. `pre` scrolls; a broken `:%s/\v\a+/\u&/g` is a wrong command.
- Every `clamp()` keeps a `rem` term, or text ignores browser zoom.
- The theme script stays inline and un-deferred in `<head>` (`layouts/_default/baseof.html`), or the page flashes.
- Fonts must cover latin-ext: the Vim post contains `Jászfelsőszentgyörgy`.
- Line text for the margins lives in `data-text`, never `data-src`.
- Bits that flash in the margins respect the vertical fade, or stray bits light up in the corners.
- A command run from the `:` line consumes its Enter with `preventDefault()`, or the keypress presses whatever the command focused.
- Post photos use `figure.photo`. The class `hero` belongs to the home headline.
- Headless screenshots at phone widths lie. Measure `scrollWidth` against `clientWidth` with device emulation at 320, 360, 390 and 430.

## Content

- GroceryBudget is abandoned and grocerybudgetph.com is offline. Never link to it.
- IBKR Screener is private. It links to its post, not to an app.

Known issues in Bryan's own words. Do not edit them without asking:

- `substite` for `substitute`, twice in the Vim post (`content/post/search-and-replace-in-vim.md`).
- The Registers section says replace *Yamagawaokachiyogamizu*, but the resulting command shows *Eexterveenschekanaal*.
- The About page (`content/about.md`) opens with ` am Bryan!` (missing "I"), says 9 years of experience (written in 2023), and its Personal Project section still describes GroceryBudget as active and links to the dead site.
