require('dotenv').config();


const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avaluos',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => {
      return Date.now() + '-' + file.originalname;
    }
  }
});

const upload = multer({ storage });


app.post('/upload', upload.array('fotos', 10), (req, res) => {
  const urls = req.files.map(file => file.path);

  res.json({
    ok: true,
    mensaje: `Fotos subidas correctamente (${urls.length})`,
    fotos: urls
  });
});



const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const cors = require('cors');

const app = express();
const path = require('path');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// 🔹 NECESARIO para formularios
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

// 🔹 Asegurar carpetas SIEMPRE (local + Render)
const baseUpload = path.join(__dirname, 'uploads');
const tempUpload = path.join(baseUpload, 'temp');

if (!fs.existsSync(tempUpload)) {
  fs.mkdirSync(tempUpload, { recursive: true });
}

// 🔹 Multer
const upload = multer({ dest: tempUpload });

// 🔹 Fecha AAMMDD
function fechaAAMMDD() {
  const d = new Date();
  return (
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
}

// 🔹 Normalizar texto
function normalizar(texto) {
  return texto
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

// 🔹 ENDPOINT PRINCIPAL
app.post('/upload', upload.array('fotos'), (req, res) => {
  try {
    const { codigo, tipo, otro } = req.body;

    if (!codigo || !tipo || !req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const nombreTipo =
      tipo === 'OTRO' && otro
        ? normalizar(otro)
        : normalizar(tipo);

    const carpetaNombre = `${codigo}_${fechaAAMMDD()}`;
    const carpetaFinal = path.join(baseUpload, carpetaNombre);

    if (!fs.existsSync(carpetaFinal)) {
      fs.mkdirSync(carpetaFinal, { recursive: true });
    }

    const existentes = fs
      .readdirSync(carpetaFinal)
      .filter(f => f.startsWith(nombreTipo)).length;

    req.files.forEach((file, i) => {
      const num = String(existentes + i + 1).padStart(2, '0');
      const nuevoNombre = `${nombreTipo}_${num}.jpg`;
      fs.renameSync(file.path, path.join(carpetaFinal, nuevoNombre));
    });

    // 🔹 ZIP (en Render queda temporal, está bien)
    const zipPath = path.join(baseUpload, `${carpetaNombre}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip');

    archive.pipe(output);
    archive.directory(carpetaFinal, false);
    archive.finalize();

    res.json({
      ok: true,
      mensaje: `Fotos guardadas correctamente (${req.files.length})`
    });

  } catch (err) {
    console.error('ERROR UPLOAD:', err);
    res.status(500).json({ error: 'Error interno al subir' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});

