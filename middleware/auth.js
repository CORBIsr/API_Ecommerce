// middleware/auth.js
const jwt = require('jsonwebtoken');

function tokenVerifier(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ errore: 'Accesso negato: token mancante' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, datiDecodificati) => {
        if (err) {
            return res.status(403).json({ errore: 'Token non valido o scaduto' });
        }
        req.utente = datiDecodificati;
        next();
    });
}

module.exports = tokenVerifier;