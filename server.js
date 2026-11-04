require('dotenv').config();
const express = require('express');

const fs = require('fs');
const path = require('path');

const app = express();

// A post page only exists when public/posts/<slug>.md or .html does; anything
// else is a 404 rather than an empty post shell.
const POSTS_DIR = path.join(__dirname, 'public', 'posts');
function sendPost(req, res) {
  const slug = req.params.slug;
  const exists = /^[a-z0-9-]+$/i.test(slug) &&
    ['.md', '.html'].some((ext) => fs.existsSync(path.join(POSTS_DIR, slug + ext)));
  if (!exists) return res.status(404).send('Not found');
  res.sendFile('post.html', { root: 'public' });
}
app.use(express.json());
app.use('/assets', express.static('assets'));

// Page routes must come before static so / serves home.html
app.get('/', (req, res) => res.sendFile('home.html', { root: 'public' }));
app.get('/home', (req, res) => res.redirect('/'));
app.get('/index.html', (req, res) => res.redirect('/'));
app.get('/cli', (req, res) => res.redirect('/'));
app.get('/writing', (req, res) => res.sendFile('writing.html', { root: 'public' }));
app.get('/writing/:slug', sendPost);
app.get('/projects', (req, res) => res.sendFile('projects.html', { root: 'public' }));
app.get('/projects/:slug', sendPost);
app.get('/library', (req, res) => res.sendFile('library.html', { root: 'public' }));
app.get('/reading', (req, res) => res.redirect(301, '/library'));
app.get('/research', (req, res) => res.sendFile('research.html', { root: 'public' }));

// Deep dives and course notes are work in progress (gitignored). Uncomment
// these once their pages are committed.
// app.get('/deep-dives', (req, res) => res.sendFile('deep-dives.html', { root: 'public' }));
// function noindex(req, res, next) {
//   res.set('X-Robots-Tag', 'noindex, nofollow');
//   next();
// }
// app.use(['/notes', '/notes-content', '/notes.html', '/notes-course.html', '/notes-note.html'], noindex);
// app.get('/notes', (req, res) => res.sendFile('notes.html', { root: 'public' }));
// app.get('/notes/:course', (req, res) => res.sendFile('notes-course.html', { root: 'public' }));
// app.get('/notes/:course/:slug', (req, res) => res.sendFile('notes-note.html', { root: 'public' }));

// Production was the old name for the writing index; keep its links working.
app.get('/production', (req, res) => res.redirect(301, '/writing'));
app.get('/production/:slug', (req, res) => res.redirect(301, '/writing/' + req.params.slug));

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// listen() here fires its callback even when the bind failed, so trust address().
const server = app.listen(PORT, () => {
  const addr = server.address();
  if (addr) console.log(`Server: http://localhost:${addr.port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different one: PORT=4321 npm start`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
