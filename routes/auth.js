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

    connection.query('SELECT utenti.id, credenziali.nome_utente AS username, credenziali.password_utente AS password, utenti.id_ruolo FROM credenziali INNER JOIN utenti ON utenti.id = credenziali.id_utente WHERE credenziali.nome_utente = ?', [nome_utente], async (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante l\'autenticazione'});
        }
        if (results.length === 0) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const user = results[0];

        try {
            const passwordValida = await bcrypt.compare(password, user.password);

            if (!passwordValida) {
                return res.status(401).json({ errore: 'Credenziali non valide' });
            }

            const payload = {
                id: user.id,
                email: user.username,
                ruolo: user.id_ruolo
            };

            const token = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.json({
                messaggio: 'Login effettuato con successo',
                token: token,
                utente: {
                    id: user.id,
                    email: user.username
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ errore: 'Errore nel processo di login' });
        }

    });
});

module.exports = router;