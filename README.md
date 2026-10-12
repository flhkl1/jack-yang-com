# jack-yang.com - Version 1.6

Minimalistic personal portfolio website 

## Changelog

### 1.6
- Split Production into Writing, Projects and Research
- Industry filter on Projects, topic filter on Research
- Google Scholar link on Research, set via `window.PROFILES`
- Removed the English/Chinese toggle
- `/production` redirects to `/writing`
- Article bodies moved out of the index file into `public/posts/`

### 1.5
- Removed the CLI/terminal interface
- Unified home and Production under one stylesheet
- Site-wide light/dark toggle
- Added Production, a native writing index

### 1.4
- Added clean frontend

### 1.3
- Changed colour scheme
- Fixed sudo logic

### 1.2
- Removed life section

### 1.1
- elevated privileges (sudo, guestbook)
- throb cursor (smooth opacity animation)
- command history (↑/↓ to browse)
- Tab autocomplete for visible commands

### 1.0
- initial release

## Features

- Home, Writing, Projects and Research sharing one stylesheet
- Site-wide light/dark toggle, persisted to localStorage
- Tag filtering and sorting on Writing; industry filter on Projects, topic filter on Research
- Responsive design

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `public/home.html` | Bio and links |
| `/writing` | `public/writing.html` | Writing index, filterable by topic. Not in the nav; reachable by URL only |
| `/writing/:slug` | `public/post.html` | A natively hosted piece |
| `/projects` | `public/projects.html` | Things built, in curated order |
| `/research` | `public/research.html` | Papers and benchmarks |
| `/production` | — | 301 to `/writing` (old name) |

Every item lives in `public/js/content.js` as `window.ITEMS`, and its `type`
(`Writing`, `Project` or `Research`) decides which index it appears on and which
card renders it. `public/js/cards.js` holds the three card builders.

A Writing item with a `url` links out to its publisher. To host one here
instead, drop the `url` and put the article HTML in `public/posts/<slug>.html`
— `post.html` fetches it on demand, so index pages stay small.

Project and Research link fields (`repo`, `demo`, `pdf`, `arxiv`, `code`) are
skipped when empty, so it is safe to leave them blank until they exist.

## Setup

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # same, but restarts on file changes
```

Set `PORT` to use a different port:

```bash
PORT=4321 npm start
```

## Tech Stack

- Node.js + Express
- Vanilla JavaScript (ES6 modules)
- CSS3

## Assets

Place in the `assets/` folder:

| File | Description |
|------|-------------|
| `photo.png` | Portrait shown in the home page sidebar |
| `NewestResume.pdf` | Resume (linked from home page) |
