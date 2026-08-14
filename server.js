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
app.get('/production', (req, res) => res.sendFile('production.html', { root: 'public' }));
app.get('/production/:slug', (req, res) => res.sendFile('post.html', { root: 'public' }));

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});
