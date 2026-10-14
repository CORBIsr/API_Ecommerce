const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const connection = require('../config/db');

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Email e password sono obbligatorie' });
    }

    connection.query(`
        SELECT users.ID, credentials.username, credentials.password, users.roleID
        FROM credentials
        INNER JOIN users ON users.ID = credentials.userID
        WHERE credentials.username = ?
    `, [username], async (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante l\'autenticazione' });
        }
        if (results.length === 0) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const user = results[0];

        try {
            const isValid = await bcrypt.compare(password, user.password);

            if (!isValid) {
                return res.status(401).json({ errore: 'Credenziali non valide' });
            }

            const payload = {
                ID: user.ID,
                username: user.username,
                role: user.roleID
            };

            const token = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.json({
                message: 'Login effettuato con successo',
                token: token,
                user: {
                    id: user.ID,
                    role: user.roleID,
                    username: user.username
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ errore: 'Errore nel processo di login' });
        }

    });
});

module.exports = router;