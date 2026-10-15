// middleware/upload.js
// Configurazioni multer per il salvataggio delle immagini, separate per prodotti e categorie.
//
// In produzione (alwaysdata) imposta nel .env del server:
//   UPLOAD_DIR=/www/img/prods
//   IMAGE_BASE_URL=https://internopuro.alwaysdata.net/img/prods
//   CATEGORY_UPLOAD_DIR=/www/img/cats
//   CATEGORY_IMAGE_BASE_URL=https://internopuro.alwaysdata.net/img/cats
// In locale, se non impostate, i file vengono salvati in ./uploads/products e
// ./uploads/categories, serviti da Express su /uploads/... per poterli testare.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createUploader(dirEnvVar, baseUrlEnvVar, localSubfolder) {
    const uploadDir = process.env[dirEnvVar] || path.join(__dirname, '..', 'uploads', localSubfolder);
    const imageBaseUrl = process.env[baseUrlEnvVar] || `/uploads/${localSubfolder}`;

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
        if (process.env[baseUrlEnvVar]) {
            return `${imageBaseUrl}/${filename}`;
        }
        return `${req.protocol}://${req.get('host')}${imageBaseUrl}/${filename}`;
    }

    function buildImageUrls(req, filenames) {
        return filenames.map(filename => buildImageUrl(req, filename));
    }

    return { upload, buildImageUrl, buildImageUrls };
}

module.exports = {
    products: createUploader('UPLOAD_DIR', 'IMAGE_BASE_URL', 'products'),
    categories: createUploader('CATEGORY_UPLOAD_DIR', 'CATEGORY_IMAGE_BASE_URL', 'categories')
};
