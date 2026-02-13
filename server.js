const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('public'));
app.use('/assets', express.static('assets'));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.get('/api/photos', (req, res) => {
  const photosDir = path.join(__dirname, 'assets', 'photos');
  const photoOrder = [
    'jit', 'jit2', 'jit3', 'beencooking', 'id_tech', 'imfooty',
    'roots', 'csunbjj_winners', 'crossing', 'fraternity', 'fight_poster', '1-0',
    'hongkong', 'club', 'tahoe', 'sequoia','yosemite', 'tbilisi', 'emido', 'yeravan',
    , 'halloween',
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
