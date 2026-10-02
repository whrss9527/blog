# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The blog of 了迹奇有没, built as a **static page app** (since 2.0; 1.x was a Go server, see tag `v1.10.0`).
`scripts/build.mjs` reads the content repository [blog-data](https://github.com/whrss9527/blog-data) and writes a
complete static site to `dist/`, which GitHub Pages serves at https://blog.whrss.com. There is no server, database or admin.
Plain Node.js (20+) ES modules, three dependencies (`marked`, `highlight.js`, `js-yaml`), no bundler, no framework.

## Commands

```bash
git clone https://github.com/whrss9527/blog-data.git   # content, next to the code (gitignored)
npm ci
npm run dev            # build + serve dist/ on http://localhost:4173 (GitHub Pages rules)
npm test               # node:test, builds test/fixtures/blog-data
npm run preview        # also writes dist/preview.html: the whole site in one file (hash routing)
node scripts/build.mjs --data ../blog-data --out dist --base /goblog   # options
node scripts/serve.mjs --dir dist --base /goblog                      # serve a base-path build
```

## Architecture

- **Content** (`scripts/lib/content.mjs`): posts are `posts/<identity>.md` with YAML front matter (`title`, `status`
  (1 = published), `created_at`, `updated_at`, `category_id`, `tag_ids`, `is_top`, `description`, `word_count`); pages are
  `pages/<id>.md`; `categories.json`, `tags.json`, `books.json`, `views.json` (frozen view counts), `covers/`.
  **Never read `users.json`** — it holds password hashes; a test checks that nothing from it reaches `dist/`.
  The file name is the address; `cleanSlug` cleans names a static host can't serve (one has a trailing space), and
  `findPost` still matches the original identity, so old links resolve (the 404 page renders the right post).
- **Markdown** (`scripts/lib/markdown.mjs`): marked with `gfm` + `breaks`, plus the rules of the old editor.md
  pipeline: smartypants (curly quotes, `--` → —, `...` → …), `:fa-*:` / `:tw-*:` emoji shortcodes, sanitised inline HTML,
  heading ids from `slugify` (same algorithm as 1.x, so `#anchors` keep working), highlight.js at build time,
  tables wrapped in `.table-wrap`, code in `figure.code[data-lang]`. Tests pin these rules.
- **Views** (`src/render.js`): pure functions returning `{ title, description, main, bodyClass, … }`. Used by the build
  to pre-render every page and by the browser to render the next page after a link click. It must stay free of
  imports and Node APIs: the build concatenates `render.js` + `app.js` (stripping `export`) into `/assets/app.<hash>.js`.
  All internal hrefs go through `ctx.link(path)` and file URLs through `ctx.asset(path)` (base path / preview hashes).
- **Browser** (`src/app.js`): router (history API; hash mode in the preview), view transitions, ⌘K search palette
  (titles, tags, full text from `/data/search.json`), theme (auto/light/dark in `localStorage`), pointer light and
  card tilt, reveal on scroll, TOC scroll spy, reading progress, giscus (lazy, `mapping: specific` with the term
  `posts/<encodeURI(original identity)>` so threads created by 1.x stay attached), Google Analytics (not on local hosts),
  service worker registration.
- **Data for the browser**: `/data/site.json` (everything but bodies), `/data/posts/<slug>.json` and `/data/pages/<id>.json`
  (`{ html, toc }`), `/data/search.json` (plain text by slug), `/data/version.json` (what the build was made from).
- **Pages written by the build**: `index.html`, `posts/<slug>.html`, `pages/<id>.html`, `archive.html`, `tags.html`,
  `reading.html`, `stats.html`, `random.html`, `offline.html`, `404.html` — GitHub Pages serves `/archive` from
  `archive.html`, which keeps 1.x addresses (no trailing slash) and therefore giscus pathnames unchanged. Plus
  `feed.xml` and `feed` (Atom, pinned first then newest — the profile README sync reads this order), `sitemap.xml`,
  `robots.txt`, `manifest.webmanifest`, `sw.js` (`scripts/lib/extras.mjs`).
- **Covers** (`scripts/lib/covers.mjs`, `scripts/covers.json`): every post gets an SVG cover written to
  `covers/posts/<slug>.svg` (dark "terminal / blueprint" style in both themes, seeded by the slug). `covers.json` maps a
  slug to `{ motif, headline, sub, label, lines, … }`; unlisted posts get a motif from their tags. Covers use only
  generic font stacks (an `<img>` SVG can't load web fonts) and no external references. The preview inlines them.
- **Base path**: `--base` / `BASE_PATH` prefixes every URL so the site works as a project site
  (`https://whrss9527.github.io/goblog/`) before the custom domain is set; the deploy workflow passes the base path
  GitHub Pages reports. The client reads it from `<html data-base>`.
- **Styles** (`src/style.css`): tokens on `:root`, dark mode under `prefers-color-scheme` (guarded by
  `:root:not([data-theme="light"])`) and `[data-theme="dark"]`. `.glass` = translucent fill + `backdrop-filter` + a masked
  gradient rim; `.tilt` cards get `--rx/--ry/--px/--py` from the pointer; `.reveal` uses the individual `translate`/`scale`
  properties so it composes with the tilt `transform`. Don't give a permanent `view-transition-name` to an element with
  (or containing) glass: Chromium composites it separately and its `backdrop-filter` stops blurring the page; names on
  the nav and the backdrop are set only while `html[data-nav]` is present. Honour `prefers-reduced-motion` and
  `prefers-reduced-transparency`.

## Deploy

`.github/workflows/deploy.yml`: on push to `main`, by hand, on `repository_dispatch: blog-data-updated`, and hourly
(skipped when `/data/version.json` on the live site already matches blog-data's HEAD and this commit). Pages must be
set to "GitHub Actions" in the repository settings. `.github/workflows/ci.yml` runs the tests and uploads the built
site (with `preview.html`) as an artifact for every PR.

## Conventions

- User-facing text is Simplified Chinese, plain and conversational; commit messages are English, imperative.
- Record notable changes in `CHANGELOG.md` (Chinese) and bump `package.json`'s version.
- Keep `npm test` green; when touching markdown rules, add a test with the construct a post actually uses.
