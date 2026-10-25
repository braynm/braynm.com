---
title: "Tutor"
excerpt: Seven short lessons in the keys this site understands, the way vimtutor teaches Vim.
---

Every page on this site is a Vim buffer, and this one teaches you to move around it. Do what a lesson says and a ✓ appears beside its heading. Your progress stays in this browser.

The lessons need a keyboard. On a phone, the `:` and `/` buttons in the statusline cover lessons 4 and 6.

## Lesson 1: Move down and up {#tutor-move}

Press `j` to move the cursor down one line, and `k` to move it back up. The cursor is the highlighted line. Its number in the left gutter is its real line number, and the other numbers count how far away each line is.

Press `j` a few times now, then `k`.

## Lesson 2: Go to the top and the bottom {#tutor-ends}

Press `G` to go to the last line. Press `g` twice, `gg`, to come back to the first.

## Lesson 3: Jump between sections {#tutor-sections}

The list near the top of this page shows each section as a Vim fold. Press `zj` to jump to the next section, and `zk` to jump back to the one before.

## Lesson 4: Search {#tutor-search}

Press `/`, type `cursor`, and press Enter. Every match lights up. Press `n` for the next match and `N` for the one before. Type `:noh` to clear the highlights.

A lowercase search ignores case. Put a capital letter in it and the case has to match.

## Lesson 5: Copy a line {#tutor-yank}

Move the cursor onto the code below and press `yy`. The code is copied, ready to paste.

```vim
:set bg=dark
```

## Lesson 6: Run a command {#tutor-commands}

Press `:` to open the command line at the bottom of the screen. Type `set bg=dark` and press Enter, or paste the line you copied in lesson 5. The page repaints in the dark theme, and `:set bg=light` brings the light one back.

`:writing` lists every post, `:about` and `:home` go to those pages, and `:help` lists the other commands.

## Lesson 7: Quit {#tutor-quit}

Everyone asks how to quit Vim. Type `:q!` and press Enter to find out. A button there opens the site again.

## Summary {#tutor-summary}

- `j` and `k` move down and up, and `gg` and `G` go to the top and the bottom.
- `zj` and `zk` jump between sections.
- `/` searches, and `n` and `N` step through the matches.
- `yy` copies the line under the cursor.
- `:` runs a command, and `:help` lists them.
- `Enter` opens the link on the cursor line. Try it on [:Explore post/](/post/).
