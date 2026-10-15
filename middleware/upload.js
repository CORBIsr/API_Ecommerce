// middleware/upload.js
// Configurazione multer condivisa per il salvataggio delle immagini prodotto.
//
// In produzione (alwaysdata) imposta nel .env del server:
//   UPLOAD_DIR=/www/img/prods
//   IMAGE_BASE_URL=https://internopuro.alwaysdata.net/img/prods
// In locale, se non impostate, i file vengono salvati in ./uploads e serviti
// da Express su http://localhost:<PORT>/uploads per poterli testare.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const imageBaseUrl = process.env.IMAGE_BASE_URL || '/uploads';

if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
        console.error(`Impossibile creare la cartella di upload "${uploadDir}":`, err.message);
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Sono ammesse solo immagini'));
        }
        cb(null, true);
    }
});

function buildImageUrl(req, filename) {
    if (process.env.IMAGE_BASE_URL) {
        return `${imageBaseUrl}/${filename}`;
    }
    return `${req.protocol}://${req.get('host')}${imageBaseUrl}/${filename}`;
}

module.exports = { upload, buildImageUrl };
