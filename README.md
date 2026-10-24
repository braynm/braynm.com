# braynm.com

Bryan Madrid's personal site and blog. The site behaves like a Vim buffer: line numbers, a cursor line, a statusline, a `:` command line, and a live binary dump of the current line in the margins.

It is plain HTML, CSS and JavaScript modules. There is no build step, no npm and no framework. Everything Cloudflare serves is in `site/`.

- What visitors can do: `docs/HOW-IT-WORKS.md`
- How it is built, and how to add a post: `docs/ARCHITECTURE.md`

## Run it locally

```sh
python3 -m http.server 8765 --directory site
```

Open http://127.0.0.1:8765. Opening the files with `file://` does not work, because links and modules use root-relative paths.

## Deploy

Cloudflare Pages builds from the `main` branch of `github.com/braynm/braynm.com`. Pushing to `main` deploys.

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | (empty) |
| Build output directory | `site` |

Only `site/` is published. `README.md`, `CLAUDE.md`, `docs/` and `tools/` stay in the repository and are never served.

## Share cards

Each page has a 1200×630 preview image in `site/images/og/`. After you add or rename a post, render them again from the repository root:

```sh
node tools/og.mjs
```

It needs Node 22 or later and Google Chrome. Set `CHROME` if Chrome is not in `/Applications`.
