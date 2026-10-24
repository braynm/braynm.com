# braynm.com

Static HTML, CSS and ES modules. Everything Cloudflare serves is in `site/`; nothing else in this repository is published. There is no build step. Claude edits the HTML directly.

- What visitors see: `docs/HOW-IT-WORKS.md`
- How it is built, and the steps to add a post: `docs/ARCHITECTURE.md`
- Run, deploy, share cards: `README.md`

## Rules that encode bugs already hit

- Code never wraps. `pre` scrolls; a broken `:%s/\v\a+/\u&/g` is a wrong command.
- Every `clamp()` keeps a `rem` term, or text ignores browser zoom.
- The theme script stays inline and un-deferred in `<head>`, or the page flashes.
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

- `substite` for `substitute`, twice in the Vim post.
- The Registers section says replace *Yamagawaokachiyogamizu*, but the resulting command shows *Eexterveenschekanaal*.
- The About page opens with ` am Bryan!` (missing "I"), says 9 years of experience (written in 2023), and its Personal Project section still describes GroceryBudget as active and links to the dead site.
