const express = require('express');
const router = express.Router();

const connection = require('../config/db');

router.get('/', (req, res) => {
    const userID = req.utente.id;

    connection.query('SELECT nome, cognome FROM utenti WHERE id = ?',[userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.get('/carrello', (req, res) => {
    const userID = req.utente.id;

    connection.query('SELECT dettagli_carrello.id_prodotto AS id, dettagli_carrello.quantita_prodotto AS quantita, prodotti.id_prodotto FROM dettagli_carrello INNER JOIN prodotti ON dettagli_carrello.id_prodotto = prodotti.id INNER JOIN carrelli ON dettagli_carrello.id_carrello = carrelli.id WHERE carrelli.id_utente = ?',[userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            var cart = []
            var index = {}

            results.forEach(p => {
                if(p.id_prodotto === null){
                    const prod = {
                        id: p.id,
                        quantita: p.quantita,
                        accessori: []
                    }
                    index[p.id] = prod;
                    cart.push(prod);
                }
            });
            results.forEach(a => {
                if(a.id_prodotto !== null){
                    index[a.id_prodotto].accessori.push({
                        id_accessorio: a.id,
                        quantita: a.quantita
                    })
                }
            })

            res.json(cart);
        }
    });

});

router.get('/ordini', (req, res) => {
    const userID = req.utente.id;

    connection.query(`
            SELECT 	ordini.id, 
                ordini.data_ordine, 
                stati_ordine.status_ordine AS status, 
                CONCAT(indirizzi.via, ', ', indirizzi.citta, ', ', indirizzi.stato) AS indirizzo,
                SUM(dettagli_ordine.quantita_prodotto) AS numero_prodotti,
                SUM(dettagli_ordine.prezzo_prodotto) AS costo_prodotti,
                ordini.costo_consegna
            FROM ordini
            INNER JOIN stati_ordine ON ordini.id_status = stati_ordine.id
            INNER JOIN indirizzi ON ordini.id_indirizzo = indirizzi.id
            INNER JOIN dettagli_ordine ON ordini.id = dettagli_ordine.id_ordine
            INNER JOIN utenti ON ordini.id_utente = utenti.id
            WHERE utenti.id = ?
            GROUP BY ordini.id
            ORDER BY stati_ordine.id;
        `,[userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.get('/ordini/:id_ordine', (req, res) => {
    const userID = req.utente.id;
    const ordineID = req.params.id_ordine

    connection.query(`
            SELECT 	ordini.id, 
                ordini.data_ordine, 
                stati_ordine.status_ordine AS status, 
                CONCAT(indirizzi.via, ', ', indirizzi.citta, ', ', indirizzi.stato) AS indirizzo,
                SUM(dettagli_ordine.quantita_prodotto) AS numero_prodotti,
                SUM(dettagli_ordine.prezzo_prodotto) AS costo_prodotti,
                ordini.costo_consegna
            FROM ordini
            INNER JOIN stati_ordine ON ordini.id_status = stati_ordine.id
            INNER JOIN indirizzi ON ordini.id_indirizzo = indirizzi.id
            INNER JOIN dettagli_ordine ON ordini.id = dettagli_ordine.id_ordine
            INNER JOIN utenti ON ordini.id_utente = utenti.id
            WHERE 
                utenti.id = ${userID} AND ordini.id = ${ordineID}
            GROUP BY ordini.id
            ORDER BY stati_ordine.id;
        `, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.get('/indirizzi', (req, res) => {
    const userID = req.utente.id;

    connection.query('SELECT id, via, citta, stato FROM indirizzi WHERE id_utente = ?;', [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});


module.exports = router;