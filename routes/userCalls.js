const express = require('express');
const router = express.Router();

const connection = require('../config/db');

router.get('/', (req, res) => {
    const userID = req.utente.id;

    connection.query('SELECT nome, cognome FROM utenti WHERE id = ?', [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.get('/cart', (req, res) => {
    const userID = req.utente.id;

    connection.query('SELECT dettagli_carrello.id_prodotto AS id, dettagli_carrello.quantita_prodotto AS quantita, prodotti.id_prodotto FROM dettagli_carrello INNER JOIN prodotti ON dettagli_carrello.id_prodotto = prodotti.id INNER JOIN carrelli ON dettagli_carrello.id_carrello = carrelli.id WHERE carrelli.id_utente = ?', [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            var cart = []
            var index = {}

            results.forEach(p => {
                if (p.id_prodotto === null) {
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
                if (a.id_prodotto !== null) {
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

router.get('/orders', (req, res) => {
    const userID = req.utente.id;

    connection.query(`
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
            INNER JOIN utenti ON ordini.id_utente = utenti.id
            WHERE utenti.id = ?
            GROUP BY ordini.id
            ORDER BY stati_ordine.id, ordini.data_ordine DESC;
        `, [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.get('/orders/:orderID', (req, res) => {
    const userID = req.utente.id;
    const ordineID = req.params.orderID

    connection.query(`
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
            INNER JOIN utenti ON ordini.id_utente = utenti.id
            WHERE 
                utenti.id = ${userID} AND ordini.id = ${ordineID}
            GROUP BY ordini.id
            ORDER BY stati_ordine.id, ordini.data_ordine DESC;
        `, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.get('/addresses', (req, res) => {
    const userID = req.utente.id;

    connection.query('SELECT id, via, localita, comune, provincia, stato FROM indirizzi WHERE id_utente = ?;', [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

// POST /api/user/carrello
// Body: { id_prodotto: int, quantita: int }
// Aggiunge un prodotto al carrello dell'utente autenticato.
// Se l'utente non ha ancora un carrello lo crea; se il prodotto è già presente aggiorna la quantità.
router.post('/carrello', (req, res) => {
    const userID = req.utente.id;
    const { id_prodotto, quantita } = req.body;

    if (!id_prodotto || !quantita || quantita < 1) {
        return res.status(400).json({ error: 'id_prodotto e quantita (>= 1) sono obbligatori' });
    }

    // Cerca il carrello dell'utente o lo crea
    connection.query('SELECT id FROM carrelli WHERE id_utente = ?', [userID], (error, results) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            return res.status(500).json({ error: 'Errore durante il recupero del carrello' });
        }

        const inserisciNelCarrello = (id_carrello) => {
            // Se il prodotto è già nel carrello aggiorna la quantità, altrimenti inserisce
            connection.query(
                'SELECT id, quantita_prodotto FROM dettagli_carrello WHERE id_carrello = ? AND id_prodotto = ?',
                [id_carrello, id_prodotto],
                (error, existing) => {
                    if (error) {
                        console.error('Errore durante l\'esecuzione della query:', error);
                        return res.status(500).json({ error: 'Errore durante il controllo del carrello' });
                    }

                    if (existing.length > 0) {
                        const nuovaQuantita = existing[0].quantita_prodotto + quantita;
                        connection.query(
                            'UPDATE dettagli_carrello SET quantita_prodotto = ? WHERE id = ?',
                            [nuovaQuantita, existing[0].id],
                            (error) => {
                                if (error) {
                                    console.error('Errore durante l\'esecuzione della query:', error);
                                    return res.status(500).json({ error: 'Errore durante l\'aggiornamento del carrello' });
                                }
                                res.status(200).json({ message: 'Quantità aggiornata nel carrello' });
                            }
                        );
                    } else {
                        connection.query(
                            'INSERT INTO dettagli_carrello (id_carrello, id_prodotto, quantita_prodotto) VALUES (?, ?, ?)',
                            [id_carrello, id_prodotto, quantita],
                            (error) => {
                                if (error) {
                                    console.error('Errore durante l\'esecuzione della query:', error);
                                    return res.status(500).json({ error: 'Errore durante l\'aggiunta al carrello' });
                                }
                                res.status(201).json({ message: 'Prodotto aggiunto al carrello' });
                            }
                        );
                    }
                }
            );
        };

        if (results.length > 0) {
            inserisciNelCarrello(results[0].id);
        } else {
            // Crea il carrello per l'utente
            connection.query('INSERT INTO carrelli (id_utente) VALUES (?)', [userID], (error, result) => {
                if (error) {
                    console.error('Errore durante l\'esecuzione della query:', error);
                    return res.status(500).json({ error: 'Errore durante la creazione del carrello' });
                }
                inserisciNelCarrello(result.insertId);
            });
        }
    });
});

// POST /api/user/ordini
// Body: { id_indirizzo: int, costo_consegna: int }
// Crea un nuovo ordine con i prodotti presenti nel carrello dell'utente e svuota il carrello.
router.post('/ordini', (req, res) => {
    const userID = req.utente.id;
    const { id_indirizzo, costo_consegna } = req.body;

    if (!id_indirizzo || costo_consegna === undefined) {
        return res.status(400).json({ error: 'id_indirizzo e costo_consegna sono obbligatori' });
    }

    // Verifica che l'indirizzo appartenga all'utente
    connection.query(
        'SELECT id FROM indirizzi WHERE id = ? AND id_utente = ?',
        [id_indirizzo, userID],
        (error, addrResults) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante la verifica dell\'indirizzo' });
            }
            if (addrResults.length === 0) {
                return res.status(404).json({ error: 'Indirizzo non trovato o non appartenente all\'utente' });
            }

            // Recupera il carrello dell'utente
            connection.query('SELECT id FROM carrelli WHERE id_utente = ?', [userID], (error, cartResults) => {
                if (error) {
                    console.error('Errore durante l\'esecuzione della query:', error);
                    return res.status(500).json({ error: 'Errore durante il recupero del carrello' });
                }
                if (cartResults.length === 0) {
                    return res.status(404).json({ error: 'Carrello non trovato' });
                }

                const id_carrello = cartResults[0].id;

                // Recupera i prodotti nel carrello con il loro prezzo
                connection.query(
                    'SELECT dettagli_carrello.id_prodotto, dettagli_carrello.quantita_prodotto, prodotti.prezzo FROM dettagli_carrello INNER JOIN prodotti ON dettagli_carrello.id_prodotto = prodotti.id WHERE dettagli_carrello.id_carrello = ?',
                    [id_carrello],
                    (error, items) => {
                        if (error) {
                            console.error('Errore durante l\'esecuzione della query:', error);
                            return res.status(500).json({ error: 'Errore durante il recupero dei prodotti del carrello' });
                        }
                        if (items.length === 0) {
                            return res.status(400).json({ error: 'Il carrello è vuoto' });
                        }

                        const data_ordine = new Date().toISOString().split('T')[0];

                        // Crea l'ordine (status 1 = "In attesa di conferma")
                        connection.query(
                            'INSERT INTO ordini (id_utente, id_status, costo_consegna, data_ordine, id_indirizzo) VALUES (?, 1, ?, ?, ?)',
                            [userID, costo_consegna, data_ordine, id_indirizzo],
                            (error, orderResult) => {
                                if (error) {
                                    console.error('Errore durante l\'esecuzione della query:', error);
                                    return res.status(500).json({ error: 'Errore durante la creazione dell\'ordine' });
                                }

                                const id_ordine = orderResult.insertId;

                                // Inserisce i dettagli dell'ordine
                                const dettagli = items.map(item => [
                                    item.id_prodotto,
                                    item.quantita_prodotto,
                                    id_ordine,
                                    item.prezzo
                                ]);

                                connection.query(
                                    'INSERT INTO dettagli_ordine (id_prodotto, quantita_prodotto, id_ordine, prezzo_prodotto) VALUES ?',
                                    [dettagli],
                                    (error) => {
                                        if (error) {
                                            console.error('Errore durante l\'esecuzione della query:', error);
                                            return res.status(500).json({ error: 'Errore durante il salvataggio dei dettagli ordine' });
                                        }

                                        // Svuota il carrello dopo aver creato l'ordine
                                        connection.query(
                                            'DELETE FROM dettagli_carrello WHERE id_carrello = ?',
                                            [id_carrello],
                                            (error) => {
                                                if (error) {
                                                    console.error('Errore durante l\'esecuzione della query:', error);
                                                    return res.status(500).json({ error: 'Errore durante lo svuotamento del carrello' });
                                                }
                                                res.status(201).json({ message: 'Ordine creato con successo', id_ordine });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            });
        }
    );
});

// POST /api/user/indirizzi
// Body: { via, localita, comune, provincia, stato }
// Aggiunge un nuovo indirizzo di spedizione per l'utente autenticato.
router.post('/indirizzi', (req, res) => {
    const userID = req.utente.id;
    const { via, localita, comune, provincia, stato } = req.body;

    if (!via || !localita || !comune || !provincia || !stato) {
        return res.status(400).json({ error: 'Tutti i campi sono obbligatori: via, localita, comune, provincia, stato' });
    }

    if (provincia.length !== 2) {
        return res.status(400).json({ error: 'La provincia deve essere un codice di 2 caratteri (es. PR)' });
    }

    connection.query(
        'INSERT INTO indirizzi (via, localita, comune, provincia, stato, id_utente) VALUES (?, ?, ?, ?, ?, ?)',
        [via, localita, comune, provincia, stato, userID],
        (error, result) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante il salvataggio dell\'indirizzo' });
            }
            res.status(201).json({ message: 'Indirizzo aggiunto con successo', id: result.insertId });
        }
    );
});

module.exports = router;