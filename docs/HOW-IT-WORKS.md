# How braynm.com works

This page describes the site from a visitor's point of view. For how it is built, see `ARCHITECTURE.md`.

## The idea

Every page is a file open in Vim. Each block of content is a line with a number in the left gutter. One line is the cursor line, and the gutter shows the other numbers relative to it, like `set relativenumber`. The bar at the bottom is Vim's statusline: the mode, the file path, the file type, the cursor position and how far down the page you are. Below it is the command line, where messages appear.

The side margins on wide screens show the current line as raw bits, the way Vim shows a file after `:%!xxd -b`. When the line changes, only the bits that differ flip, in plum. Bits near the mouse pointer light up in teal. On narrow screens the dump becomes a strip under the page title.

## Pages

| Page | Address | What it is |
|---|---|---|
| Home | `/` | The headline rewrites itself with `:s/Elixir/TypeScript/` and similar substitutions. Below it: latest posts, about, projects and contact. |
| Writing | `/post/` | Every post, laid out like netrw, Vim's file browser. |
| A post | `/post/<slug>/` | The post as a buffer. Section headings appear at the top as Vim folds (`+-- 12 lines: Capitalizing Words`). |
| About | `/about/` | Bryan's About page. |
| Missing page | anything else | `E484: Can't open file`. |

Opening a post shows Vim's real file message in the command line, for example `"post/search-and-replace-in-vim.md" 130L, 4334B`.

## Keys

The keys work whenever focus is not in a text field.

| Key | Does |
|---|---|
| `j` / `k` | Move the cursor line down or up, scrolling it into view |
| `gg` / `G` | First line / last line |
| `zj` / `zk` | Next / previous section |
| `Enter` | Open the link on the cursor line, or flip a drawing to its photo |
| `yy` | Copy the cursor line; on a code block, copy the code |
| `/` | Search the page as you type; `n` and `N` step through matches |
| `:` | Open the command line |
| `s` | On the Writing page, cycle the sort: time, name, size |
| `-` | On the Writing page, go up to the home page |

Selecting text with the mouse switches the statusline to `VISUAL`, shows the character and byte count, and puts the selection into the binary margins.

## Commands

| Command | Does |
|---|---|
| `:set bg=dark`, `:set bg=light` | Switch the theme. `:set background=...` and `:se bg=...` work too. `:set bg?` shows the current value. |
| `:writing`, `:about`, `:home`, `:Explore` | Go to that page |
| `:github`, `:mail` | Open GitHub or a new email |
| `:42` | Jump to line 42 |
| `:noh` | Clear search highlighting |
| `:help` | List the commands |

The `:set bg=...` button in the header does the same as the command. Without a saved choice the site follows the system's light or dark setting. Clicking the button first types its command into the command line, with the mode showing `COMMAND` and the command's bits flipping through the margins. Then the page repaints like a raster scan, band by band, each band printed across in steps, with a plum cursor bar as the print head: dark scans down from the top left, light scans up from the bottom right. The text repaints in plain ink, then the colors come back one highlight group at a time (comments, strings, keywords, functions), like a colorscheme loading, and the button's label changes with a substitution like the home headline's. On phones the browser bar changes color with the page. With reduced motion, the switch is a short crossfade. Moving between pages uses the same top-to-bottom repaint, cursor bar included, in browsers that support cross-document view transitions.

## Photos

Post photos are drawn with characters that are all Vim normal-mode commands, colored from the photo. Clicking the drawing, or pressing `Enter` on its line, shows the real photo. Clicking again goes back to the drawing.

## Easter eggs

| Try | Result |
|---|---|
| `:q!`, `:wq`, `:x`, `ZZ` | You exit Vim. The page becomes a shell prompt; the `vim braynm.com` button opens the site again. |
| `:q` | `E37: No write since last change (add ! to override)` |
| `:help 42` | A nod to Douglas Adams |
| `:help holy-grail` | `You found it, Arthur!` |
| `:Ni!` | `Do you demand a shrubbery?` |
| `:help!` | `E478: Don't panic!` |
| `i` | INSERT mode, but typing gets `E21: Cannot make changes, 'modifiable' is off`. `Esc` leaves. |
| `u` | `Already at oldest change` |

The page source has a hint for anyone who opens it.

## Phones

There are no Vim keys on a phone, so the statusline has `:` and `/` buttons that open the command line and search. The cursor line follows scrolling. The command line hides itself when it has no message, and moves above the on-screen keyboard while you type.
