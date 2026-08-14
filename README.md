# jack-yang.com - Version 1.5

Minimalistic personal portfolio website 

## Changelog

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

- Home page and Production (writing index) sharing one stylesheet
- Site-wide light/dark toggle, persisted to localStorage
- Tag filtering and sorting on Production
- English/Chinese toggle on the home page
- Responsive design

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `public/home.html` | Bio and links |
| `/production` | `public/production.html` | Writing index |
| `/production/:slug` | `public/post.html` | A natively hosted piece |

Writing lives in `public/js/posts.js`. A post with a `url` links out to its
publisher; give it a `body` instead and it renders on the site.

## Setup

```bash
npm install
npm start
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
