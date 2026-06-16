const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist/zitoun-angular/browser');

// CORS + headers PWA
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.path.endsWith('.webmanifest') || req.path.endsWith('manifest.json')) {
    res.setHeader('Content-Type', 'application/manifest+json');
  }
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// Fichiers statiques
app.use(express.static(DIST, {
  maxAge: '1y',
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// SPA fallback — toutes les routes → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Zitoun POS Angular running on port ${PORT}`);
});
