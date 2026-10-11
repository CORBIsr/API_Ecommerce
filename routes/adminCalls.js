const express = require('express');
const router = express.Router();

const connection = require('../config/db');

//#region users

router.get('/users', (req, res) => {
    connection.query(`
        SELECT
            users.ID, name, surname, roles.role,
            COUNT(orders.ID) AS n_orders
        FROM users
        INNER JOIN roles ON users.roleID = roles.ID
        LEFT JOIN orders ON users.ID = orders.userID
        GROUP BY users.ID;
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
    const userID = req.params.userID;

    connection.query(`
        SELECT
            name, surname, roles.role,
            addresses.street, addresses.locality, addresses.city, addresses.province, addresses.state
        FROM users
        INNER JOIN roles ON users.roleID = roles.ID
        INNER JOIN addresses ON users.ID = addresses.userID
        WHERE users.ID = ?
        GROUP BY addresses.ID
    `, [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            var user = {
                name: results[0].name,
                surname: results[0].surname,
                role: results[0].role,
                addresses: []
            }

            results.forEach(r => {
                user.addresses.push({
                    street: r.street,
                    locality: r.locality,
                    city: r.city,
                    province: r.province,
                    state: r.state
                })
            })

            res.json(user);
        }
    });

});

router.get('/roles', (req, res) => {

    connection.query('SELECT ID, role FROM roles;', (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});


//#endregion

//#region orders

router.get('/orders', (req, res) => {
    const { userID, orderID } = req.query;

    var query = `
        SELECT
            orders.ID,
            orders.date,
            order_status.status,
            CONCAT(addresses.street, ', ', addresses.locality, ', ', addresses.city, ', ', addresses.province, ', ', addresses.state) AS address,
            SUM(order_datails.qty) AS n_products,
            SUM(order_datails.price) AS total_price,
            orders.shipping_fee
        FROM orders
        INNER JOIN order_status ON orders.statusID = order_status.ID
        INNER JOIN addresses ON orders.addressID = addresses.ID
        INNER JOIN order_datails ON orders.ID = order_datails.orderID
        INNER JOIN users ON orders.userID = users.ID`;

    var filter = [];
    var IDs = [];

    if (userID) {
        filter.push("orders.userID = ?");
        IDs.push(userID);
    }
    if (orderID) {
        filter.push("orders.ID = ?");
        IDs.push(parseInt(orderID));
    }

    if (filter.length > 0) {
        query += " WHERE " + filter.join(" AND ");
    }

    query += " GROUP BY orders.ID ORDER BY orders.date DESC, orders.statusID";

    connection.query(query, IDs, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.delete('/orders/:orderID', (req, res) => {
    const orderID = req.params.orderID;

    connection.query(
        'UPDATE orders SET statusID = 6 WHERE ID = ?',
        [orderID],
        (error, result) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante l\'aggiornamento dello stato dell\'ordine' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Ordine non trovato' });
            }
            res.json({ message: 'Ordine annullato con successo', statusID: 6 });
        }
    );
});

//#endregion

//#region products

router.post('/products', (req, res) => {
    const { name, description, price, categoryID, image_path } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ error: 'name e price sono obbligatori' });
    }

    connection.query(
        'INSERT INTO products (name, description, price, categoryID) VALUES (?, ?, ?, ?)',
        [name, description || null, price, categoryID || null],
        (error, result) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante l\'inserimento del prodotto' });
            }

            const productID = result.insertId;

            if (image_path) {
                connection.query(
                    'INSERT INTO products_images (image_path, productID) VALUES (?, ?)',
                    [image_path, productID],
                    (error) => {
                        if (error) {
                            console.error('Errore durante l\'esecuzione della query:', error);
                            return res.status(500).json({ error: 'Prodotto creato ma errore nel salvataggio dell\'immagine' });
                        }
                        res.status(201).json({ message: 'Prodotto creato con successo', productID });
                    }
                );
            } else {
                res.status(201).json({ message: 'Prodotto creato con successo', productID });
            }
        }
    );
});

router.delete('/products/:productID', (req, res) => {
    const productID = req.params.productID;

    connection.query(
        'UPDATE products SET active = 0 WHERE ID = ?',
        [productID],
        (error, result) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante la disattivazione del prodotto' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Prodotto non trovato' });
            }
            res.json({ message: 'Prodotto disattivato con successo' });
        }
    );
});

//#endregion

//#region categories

router.post('/categories', (req, res) => {
    const { category, image_path } = req.body;

    if (!category) {
        return res.status(400).json({ error: 'category è obbligatorio' });
    }

    connection.query(
        'INSERT INTO categories (category) VALUES (?)',
        [category],
        (error, result) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante l\'inserimento della categoria' });
            }

            const categoryID = result.insertId;

            if (image_path) {
                connection.query(
                    'INSERT INTO category_images (image_path, categoryID) VALUES (?, ?)',
                    [image_path, categoryID],
                    (error) => {
                        if (error) {
                            console.error('Errore durante l\'esecuzione della query:', error);
                            return res.status(500).json({ error: 'Categoria creata ma errore nel salvataggio dell\'immagine' });
                        }
                        res.status(201).json({ message: 'Categoria creata con successo', categoryID });
                    }
                );
            } else {
                res.status(201).json({ message: 'Categoria creata con successo', categoryID });
            }
        }
    );
});

//#endregion

module.exports = router;