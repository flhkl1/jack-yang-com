require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/assets', express.static('assets'));

app.post('/api/sudo', (req, res) => {
  const { password } = req.body || {};
  const expected = process.env.SUDO_PASSWORD || '';
  const ok = typeof password === 'string' && password === expected;
  res.json({ ok });
});

const GUESTBOOK_PATH = path.join(__dirname, 'data', 'guestbook.json');

function readGuestbook() {
  try {
    const data = fs.readFileSync(GUESTBOOK_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeGuestbook(entries) {
  try {
    const dir = path.dirname(GUESTBOOK_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GUESTBOOK_PATH, JSON.stringify(entries, null, 2), 'utf8');
  } catch (err) {
    console.error('Guestbook write error:', err.message);
  }
}

app.get('/api/guestbook', (req, res) => {
  res.json(readGuestbook());
});

app.post('/api/guestbook', (req, res) => {
  const { name, message } = req.body || {};
  const n = String(name || '').trim();
  const m = String(message || '').trim();
  if (!n || !m) {
    return res.status(400).json({ ok: false, error: 'name and message required' });
  }
  const entries = readGuestbook();
  entries.unshift({
    name: n,
    message: m,
    date: new Date().toISOString(),
  });
  writeGuestbook(entries);
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.get('/api/photos', (req, res) => {
  const photosDir = path.join(__dirname, 'assets', 'photos');
  const photoOrder = [
    'jit', 'jit2', 'jit3', 'beencooking', 'id_tech', 'imfooty',
    'roots', 'csunbjj_winners', 'crossing', 'fraternity', 'fight_poster', '1-0',
    'hongkong', 'club', 'tahoe', 'sequoia', 'yosemite', 'tbilisi', 'emido', 'yeravan',
    'halloween',
  ];

  fs.readdir(photosDir, (err, files) => {
    if (err) {
      return res.json([]);
    }
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|JPG|JPEG|png|PNG|heic|HEIC)$/i.test(file)
    );
    
    const ordered = [];
    photoOrder.forEach(function (baseName) {
      const found = imageFiles.find(file => 
        file.toLowerCase().startsWith(baseName.toLowerCase() + '.') ||
        file.toLowerCase() === baseName.toLowerCase()
      );
      if (found) {
        ordered.push(found);
      }
    });
    
    res.json(ordered);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});
