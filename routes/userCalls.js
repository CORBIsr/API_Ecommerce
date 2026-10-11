const express = require('express');
const router = express.Router();

const connection = require('../config/db');

//#region user

router.get('/', (req, res) => {
    const userID = req.user.ID;

    connection.query('SELECT name, surname FROM users WHERE ID = ?', [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

//#endregion

//#region cart

router.get('/carts', (req, res) => {
    const userID = req.user.ID;

    connection.query(`
        SELECT 
            cart_details.productID AS id,
            cart_details.qty AS quantity,
            products.productID AS fatherID
        FROM cart_details
        INNER JOIN products ON cart_details.productID = products.ID
        INNER JOIN carts ON cart_details.cartID = carts.ID
        WHERE carts.userID = ?
    `, [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            var cart = []
            var index = {}

            results.forEach(p => {
                if (p.fatherID === null) {
                    const prod = {
                        id: p.id,
                        quantity: p.quantity,
                        accessories: []
                    }
                    index[p.id] = prod;
                    cart.push(prod);
                }
            });
            results.forEach(a => {
                if (a.fatherID !== null) {
                    index[a.fatherID].accessories.push({
                        accessoryID: a.id,
                        quantity: a.quantity
                    })
                }
            })

            res.json(cart);
        }
    });

});

router.post('/carts', (req, res) => {
    const userID = req.user.ID;
    const { productID, quantity } = req.body;

    if (!productID || !quantity || quantity < 1) {
        return res.status(400).json({ error: 'id_prodotto e quantita (>= 1) sono obbligatori' });
    }

    // Cerca il carrello dell'utente o lo crea
    connection.query('SELECT ID FROM carts WHERE userID = ?', [userID], (error, results) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            return res.status(500).json({ error: 'Errore durante il recupero del carrello' });
        }

        const insert = (cartID) => {
            connection.query(
                'SELECT ID, qty FROM cart_details WHERE cartID = ? AND productID = ?',
                [cartID, productID],
                (error, existing) => {
                    if (error) {
                        console.error('Errore durante l\'esecuzione della query:', error);
                        return res.status(500).json({ error: 'Errore durante il controllo del carrello' });
                    }

                    if (existing.length > 0) {
                        const new_quantity = existing[0].qty + quantity;
                        connection.query(
                            'UPDATE cart_details SET qty = ? WHERE ID = ?',
                            [new_quantity, existing[0].ID],
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
                            'INSERT INTO cart_details (cartID, productID, qty) VALUES (?, ?, ?)',
                            [cartID, productID, quantity],
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
            insert(results[0].ID);
        } else {
            // Crea il carrello per l'utente
            connection.query('INSERT INTO carts (userID) VALUES (?)', [userID], (error, result) => {
                if (error) {
                    console.error('Errore durante l\'esecuzione della query:', error);
                    return res.status(500).json({ error: 'Errore durante la creazione del carrello' });
                }
                insert(result.insertId);
            });
        }
    });
});

//#endregion

//#region orders

router.get('/orders', (req, res) => {
    const userID = req.user.ID;

    connection.query(`
        SELECT
            orders.ID,
            orders.date,
            order_status.status,
            CONCAT(addresses.street, ', ', addresses.locality, ', ', addresses.city, ', ', addresses.province, ', ', addresses.state) AS address,
            SUM(order_datails.qty) AS n_product,
            SUM(order_datails.price) AS total_price,
            orders.shipping_fee
        FROM orders
        INNER JOIN order_status ON orders.statusID = order_status.ID
        INNER JOIN addresses ON orders.addressID = addresses.ID
        INNER JOIN order_datails ON orders.ID = order_datails.orderID
        INNER JOIN users ON orders.userID = users.ID
        WHERE users.ID = ?
        GROUP BY orders.ID
        ORDER BY order_status.ID, orders.date DESC;
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
    const userID = req.user.ID;
    const ordineID = req.params.orderID;

    connection.query(`
        SELECT
            orders.ID,
            orders.date,
            order_status.status,
            CONCAT(addresses.street, ', ', addresses.locality, ', ', addresses.city, ', ', addresses.province, ', ', addresses.state) AS address,
            SUM(order_datails.qty) AS n_product,
            SUM(order_datails.price) AS total_price,
            orders.shipping_fee
        FROM orders
        INNER JOIN order_status ON orders.statusID = order_status.ID
        INNER JOIN addresses ON orders.addressID = addresses.ID
        INNER JOIN order_datails ON orders.ID = order_datails.orderID
        INNER JOIN users ON orders.userID = users.ID
        WHERE users.ID = ? AND orders.ID = ?
        GROUP BY orders.ID
        ORDER BY order_status.ID, orders.date DESC;
    `, [userID, ordineID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.post('/orders', (req, res) => {
    const userID = req.user.ID;
    const { addressID, shipping_fee } = req.body;

    if (!addressID || shipping_fee === undefined) {
        return res.status(400).json({ error: 'id_indirizzo e costo_consegna sono obbligatori' });
    }

    // Verifica che l'indirizzo appartenga all'utente
    connection.query(
        'SELECT ID FROM addresses WHERE ID = ? AND userID = ?',
        [addressID, userID],
        (error, addrResults) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante la verifica dell\'indirizzo' });
            }
            if (addrResults.length === 0) {
                return res.status(404).json({ error: 'Indirizzo non trovato o non appartenente all\'utente' });
            }

            // Recupera il carrello dell'utente
            connection.query('SELECT ID FROM carts WHERE userID = ?', [userID], (error, cartResults) => {
                if (error) {
                    console.error('Errore durante l\'esecuzione della query:', error);
                    return res.status(500).json({ error: 'Errore durante il recupero del carrello' });
                }
                if (cartResults.length === 0) {
                    return res.status(404).json({ error: 'Carrello non trovato' });
                }

                const cartID = cartResults[0].ID;

                // Recupera i prodotti nel carrello con il loro prezzo
                connection.query(
                    `SELECT cart_details.productID, cart_details.qty, products.price
                     FROM cart_details
                     INNER JOIN products ON cart_details.productID = products.ID
                     WHERE cart_details.cartID = ?`,
                    [cartID],
                    (error, items) => {
                        if (error) {
                            console.error('Errore durante l\'esecuzione della query:', error);
                            return res.status(500).json({ error: 'Errore durante il recupero dei prodotti del carrello' });
                        }
                        if (items.length === 0) {
                            return res.status(400).json({ error: 'Il carrello è vuoto' });
                        }

                        const date = new Date().toISOString().split('T')[0];

                        // Crea l'ordine (statusID 1 = "In attesa di conferma")
                        connection.query(
                            'INSERT INTO orders (userID, statusID, shipping_fee, date, addressID) VALUES (?, 1, ?, ?, ?)',
                            [userID, shipping_fee, date, addressID],
                            (error, orderResult) => {
                                if (error) {
                                    console.error('Errore durante l\'esecuzione della query:', error);
                                    return res.status(500).json({ error: 'Errore durante la creazione dell\'ordine' });
                                }

                                const orderID = orderResult.insertId;

                                // Inserisce i dettagli dell'ordine
                                const details = items.map(item => [
                                    item.productID,
                                    item.qty,
                                    orderID,
                                    item.price
                                ]);

                                connection.query(
                                    'INSERT INTO order_datails (productID, qty, orderID, price) VALUES ?',
                                    [details],
                                    (error) => {
                                        if (error) {
                                            console.error('Errore durante l\'esecuzione della query:', error);
                                            return res.status(500).json({ error: 'Errore durante il salvataggio dei dettagli ordine' });
                                        }

                                        // Svuota il carrello dopo aver creato l'ordine
                                        connection.query(
                                            'DELETE FROM cart_details WHERE cartID = ?',
                                            [cartID],
                                            (error) => {
                                                if (error) {
                                                    console.error('Errore durante l\'esecuzione della query:', error);
                                                    return res.status(500).json({ error: 'Errore durante lo svuotamento del carrello' });
                                                }
                                                res.status(201).json({ message: 'Ordine creato con successo', orderID });
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

//#endregion

//#region addresses

router.get('/addresses', (req, res) => {
    const userID = req.user.ID;

    connection.query('SELECT ID, street, locality, zip_code, city, province, state FROM addresses WHERE userID = ? AND active = 1;', [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.post('/addresses', (req, res) => {
    const userID = req.user.ID;
    const { street, locality, zip_code, city, province, state } = req.body;

    if (!street || !locality || !city || !province || !state) {
        return res.status(400).json({ error: 'Tutti i campi sono obbligatori: street, locality, city, province, state' });
    }

    if (province.length !== 2) {
        return res.status(400).json({ error: 'La province deve essere un codice di 2 caratteri (es. PR)' });
    }

    connection.query(
        'INSERT INTO addresses (street, locality, zip_code, city, province, state, userID) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [street, locality, zip_code || 0, city, province, state, userID],
        (error, result) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante il salvataggio dell\'indirizzo' });
            }
            res.status(201).json({ message: 'Indirizzo aggiunto con successo', id: result.insertId });
        }
    );
});

router.delete('/addresses/:addressID', (req, res) => {
    const userID = req.user.ID;
    const addressID = req.params.addressID;

    connection.query(
        'UPDATE addresses SET active = 0 WHERE ID = ? AND userID = ?',
        [addressID, userID],
        (error, result) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante la disattivazione dell\'indirizzo' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Indirizzo non trovato o non autorizzato' });
            }
            res.json({ message: 'Indirizzo disattivato con successo' });
        }
    );
});

//#endregion

module.exports = router;