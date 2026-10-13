require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());
app.use('/assets', express.static('assets'));

// Page routes must come before static so / serves home.html
app.get('/', (req, res) => res.sendFile('home.html', { root: 'public' }));
app.get('/home', (req, res) => res.redirect('/'));
app.get('/index.html', (req, res) => res.redirect('/'));
app.get('/cli', (req, res) => res.redirect('/'));
// Writing is no longer in the nav; the index and its pieces stay reachable by URL.
app.get('/writing', (req, res) => res.sendFile('writing.html', { root: 'public' }));
app.get('/writing/:slug', (req, res) => res.sendFile('post.html', { root: 'public' }));
app.get('/projects', (req, res) => res.sendFile('projects.html', { root: 'public' }));
app.get('/projects/:slug', (req, res) => res.sendFile('post.html', { root: 'public' }));
// Research is out of the nav for now; the page stays reachable by URL.
app.get('/research', (req, res) => res.sendFile('research.html', { root: 'public' }));

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
