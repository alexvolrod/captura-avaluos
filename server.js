const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const app = express();
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/temp/' });

function fechaAAMMDD() {
  const d = new Date();
  return (
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
}

function normalizar(texto) {
  return texto.toUpperCase().trim().replace(/\s+/g, '_');
}

app.post('/upload', upload.fields([
  { name: 'originals', maxCount: 50 },
  { name: 'optimized', maxCount: 50 }
]), (req, res) => {

  const { codigo, tipo, otro } = req.body;
  const nombreTipo = tipo === 'OTRO' ? normalizar(otro) : normalizar(tipo);

  if (!codigo || !nombreTipo) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const base = `${codigo}_${fechaAAMMDD()}`;
  const basePath = path.join(__dirname, 'uploads', base);

  const origDir = path.join(basePath, 'originals');
  const optDir = path.join(basePath, 'optimized');

  fs.mkdirSync(origDir, { recursive: true });
  fs.mkdirSync(optDir, { recursive: true });

  const existentes = fs.readdirSync(optDir)
    .filter(f => f.startsWith(nombreTipo)).length;

  req.files.optimized.forEach((file, i) => {
    const num = String(existentes + i + 1).padStart(2, '0');
    const name = `${nombreTipo}_${num}.jpg`;
    fs.renameSync(file.path, path.join(optDir, name));
  });

  req.files.originals.forEach((file, i) => {
    const num = String(existentes + i + 1).padStart(2, '0');
    const name = `${nombreTipo}_${num}.jpg`;
    fs.renameSync(file.path, path.join(origDir, name));
  });

  const zipDir = 'H:/Mi unidad/AVALUOS_APP/AVALUADOR_ALEX';
  fs.mkdirSync(zipDir, { recursive: true });

  const zipPath = path.join(zipDir, `${base}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip');

  archive.pipe(output);
  archive.directory(optDir, 'FOTOS');
  archive.finalize();

  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('Servidor activo en http://localhost:3000');
});
