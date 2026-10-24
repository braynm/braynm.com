# braynm.com

Bryan Madrid's personal site and blog. The site behaves like a Vim buffer: line numbers, a cursor line, a statusline, a `:` command line, and a live binary dump of the current line in the margins.

Posts are Markdown. Hugo builds them, with plain CSS and JavaScript modules, into `site/`, which is committed. There is no npm and no framework, and Cloudflare serves `site/` as it is.

- What visitors can do: `docs/HOW-IT-WORKS.md`
- How it is built, and how to add a post: `docs/ARCHITECTURE.md`

It needs Hugo 0.115 or later (`brew install hugo`).

## Write a post

```sh
hugo new post/my-post.md    # then fill in the front matter and write
hugo server                 # live preview at http://localhost:1313
tools/publish.sh            # build site/ and the share cards
```

Delete `draft: true` from the front matter when the post is ready, then commit and push. `docs/ARCHITECTURE.md` has the details.

## Run it locally

```sh
hugo server
```

Open http://localhost:1313. To check exactly what Cloudflare will serve, run `hugo` and serve the output with `python3 -m http.server 8765 --directory site`. Opening the files with `file://` does not work, because links and modules use root-relative paths.

## Deploy

Cloudflare Pages builds from the `main` branch of `github.com/braynm/braynm.com`. Pushing to `main` deploys.

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | (empty) |
| Build output directory | `site` |

Only `site/` is published, and Cloudflare never runs Hugo, so build and commit `site/` before pushing. The sources (`content/`, `layouts/`, `static/`, `hugo.toml`), `README.md`, `CLAUDE.md`, `docs/` and `tools/` stay in the repository and are never served.

## Share cards

Each page has a 1200×630 preview image in `static/images/og/`. `tools/publish.sh` renders them from the built pages, so run it after you add a post or change a title or excerpt.

It needs Node 22 or later and Google Chrome. Set `CHROME` if Chrome is not in `/Applications`.
