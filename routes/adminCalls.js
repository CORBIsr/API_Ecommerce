const express = require('express');
const router = express.Router();

const connection = require('../config/db');

router.get('/users', (req, res) => {
    connection.query(`
            SELECT 	
                    utenti.id, nome, cognome, ruoli.ruolo,
                    COUNT(ordini.id) AS n_ordini
                FROM utenti
                INNER JOIN ruoli ON utenti.id_ruolo = ruoli.id
                LEFT JOIN ordini ON utenti.id = ordini.id_utente
                GROUP BY utenti.id;
        `, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.get('/users/:userID', (req, res) => {
    const userID = req.params.userID

    connection.query(`
        SELECT 
            nome, cognome, ruoli.ruolo,
            indirizzi.via, indirizzi.localita, indirizzi.comune, indirizzi.provincia, indirizzi.stato
            FROM utenti
            INNER JOIN ruoli ON utenti.id_ruolo = ruoli.id
            INNER JOIN indirizzi ON utenti.id = indirizzi.id_utente
            WHERE utenti.id = ?
            GROUP BY indirizzi.id
        `, [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            var user = {
                nome: results[0].nome,
                cognome: results[0].cognome,
                ruolo: results[0].ruolo,
                indirizzi: []
            }

            results.forEach(r => {
                user.indirizzi.push({
                    via: r.via,
                    localita: r.localita,
                    comune: r.comune,
                    provincia: r.provincia,
                    stato: r.stato
                })
            })

            res.json(user);
        }
    });

});

router.get('/orders', (req, res) => {
    const { userID, orderID } = req.query

    var query = `
                SELECT 	ordini.id, 
                        ordini.data_ordine, 
                        stati_ordine.status_ordine AS status, 
                        CONCAT(indirizzi.via, ', ', indirizzi.localita, ', ', indirizzi.comune, ', ', indirizzi.provincia, ', ', indirizzi.stato) AS indirizzo,
                        SUM(dettagli_ordine.quantita_prodotto) AS numero_prodotti,
                        SUM(dettagli_ordine.prezzo_prodotto) AS costo_prodotti,
                        ordini.costo_consegna
                    FROM ordini
                    INNER JOIN stati_ordine ON ordini.id_status = stati_ordine.id
                    INNER JOIN indirizzi ON ordini.id_indirizzo = indirizzi.id
                    INNER JOIN dettagli_ordine ON ordini.id = dettagli_ordine.id_ordine
                    INNER JOIN utenti ON ordini.id_utente = utenti.id`;
    var filter = []
    var IDs = []

    if (userID) {
        filter.push("ordini.id_utente = ?")
        IDs.push(userID)
    }
    if (orderID) {
        filter.push("ordini.id = ?")
        IDs.push(parseInt(orderID))
    }

    if (filter.length > 0) {
        query += " WHERE " + filter.join(" AND ")
    }

    query += " GROUP BY ordini.id ORDER BY ordini.data_ordine DESC, ordini.id_status";

    connection.query(query, IDs, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.get('/roles', (req, res) => {

    connection.query('SELECT id, ruolo FROM ruoli;', (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

module.exports = router;