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

Only `site/` is published, and Cloudflare never runs Hugo, so build and commit `site/` before pushing. The sources (`content/`, `layouts/`, `assets/`, `static/`, `hugo.toml`), `README.md`, `CLAUDE.md`, `docs/` and `tools/` stay in the repository and are never served.

## Typua

`/typua/` serves Typua, a TypeScript course built in a separate repository at `~/typescript/typua`. Its build is committed in `static/typua/`, and Hugo copies it into `site/typua/` like any other static file. Never edit `static/typua/` by hand: rebuild Typua and copy the build in.

To update it:

```sh
cd ~/typescript/typua
pnpm build                                                     # build Typua into dist/
rsync -a --delete dist/ ~/braynm.com/website-v2/static/typua/  # make static/typua/ an exact copy of dist/
cd ~/braynm.com/website-v2
hugo                                                           # copy it into site/typua/
```

Then commit `static/typua/` and `site/typua/` together and push. Keep `--delete`: Typua names every file in `assets/` by its hash, so each build has new file names, and `--delete` removes the old ones. Keep the slash after `dist/`, or rsync puts the files in `static/typua/dist/`.

Typua's build uses relative paths, so it works under `/typua/` with no configuration. `static/_headers` caches `/typua/assets/*` for a year, like `js/` and `css/`. To check it before pushing, serve `site/` as in "Run it locally" and open http://localhost:8765/typua/.

## Share cards

Each page has a 1200×630 preview image in `static/images/og/`. `tools/publish.sh` renders them from the built pages, so run it after you add a post or change a title or excerpt.

It needs Node 22 or later and Google Chrome. Set `CHROME` if Chrome is not in `/Applications`.
