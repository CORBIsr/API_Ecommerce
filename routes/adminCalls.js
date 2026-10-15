const express = require('express');
const router = express.Router();

const connection = require('../config/db');
const { upload, buildImageUrl } = require('../middleware/upload');

//#region users

router.get('/users', (req, res) => {
    connection.query(`
        SELECT
            users.ID, name, surname, roles.role, COUNT(orders.ID) AS n_orders
        FROM users
        INNER JOIN roles ON users.roleID = roles.ID
        LEFT JOIN orders ON users.ID = orders.userID
        ${!req.isOwner ? "WHERE roles.ID IN (2, 3)" : ""}   
        GROUP BY users.ID
        ORDER BY users.roleID, users.surname, users.name;
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
            addresses.street, addresses.locality, addresses.zip_code, addresses.city, addresses.province, addresses.state
        FROM users
        INNER JOIN roles ON users.roleID = roles.ID
        LEFT JOIN addresses ON users.ID = addresses.userID
        WHERE ${!req.isOwner ? "roles.ID IN (2, 3) AND " : ""} users.ID = ?
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
                    zip_code: r.zip_code,
                    city: r.city,
                    province: r.province,
                    state: r.state
                })
            })

            res.json(user);
        }
    });

});

router.delete('/users/:userID', (req, res) => {
    const userID = req.params.userID;

    connection.query('UPDATE users SET roleID = 3 WHERE ID = ?', [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json({ message: "utente disabilitato" });
        }
    });

});

router.put('/users/:userID', (req, res) => {
    const userID = req.params.userID;
    const { name, surname, roleID } = req.body;

    if (!name || !surname) {
        return res.status(400).json({ error: 'name e surname sono obbligatori' });
    }

    let sql = 'UPDATE users SET name = ?, surname = ?';
    let params = [name, surname];

    if (roleID !== undefined) {
        if (!req.isOwner && (roleID === 0 || roleID === 1)) {
            return res.status(403).json({ error: 'Non hai i permessi per assegnare questo ruolo' });
        }
        sql += ', roleID = ?';
        params.push(roleID);
    }

    sql += ' WHERE ID = ?';
    params.push(userID);

    connection.query(sql, params, (error, result) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            return res.status(500).json({ error: 'Errore durante l\'aggiornamento dell\'utente' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }
        res.json({ message: 'Utente aggiornato con successo' });
    });
});

router.get('/roles', (req, res) => {

    connection.query(`SELECT ID, role FROM roles ${!req.isOwner ? "WHERE ID IN (2, 3)" : ""}`, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json({ results });
        }
    });

});


//#endregion

//#region orders

router.get('/orders', (req, res) => {
    const { userID, orderID } = req.query;

    var query = `
        SELECT
            orders.userID,
            orders.ID,
            orders.date,
            order_status.status,
            CONCAT(addresses.street, ', ', addresses.locality, ', ', addresses.zip_code, ', ', addresses.city, ', ', addresses.province, ', ', addresses.state) AS address,
            ${orderID ? `
                order_datails.productID AS productID,
                products.name,
                products.price,
                (SELECT products_images.image_path FROM products_images WHERE products.ID = products_images.productID LIMIT 1) AS image,
                order_datails.qty AS quantity,
                products.productID AS fatherID,
                SUM(order_datails.qty) OVER(PARTITION BY orders.ID) AS n_products,
                SUM(order_datails.price) OVER(PARTITION BY orders.ID) AS total_price,
                `: `
                SUM(order_datails.qty) AS n_products,
                SUM(order_datails.price) AS total_price,
                `}
            orders.shipping_fee
        FROM orders
        INNER JOIN order_status ON orders.statusID = order_status.ID
        INNER JOIN addresses ON orders.addressID = addresses.ID
        INNER JOIN order_datails ON orders.ID = order_datails.orderID
        ${orderID ? "INNER JOIN products ON order_datails.productID = products.ID" : ""}
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
    if (!req.isOwner) {
        filter.push("users.roleID IN (2, 3)")
    }

    if (filter.length > 0) {
        query += " WHERE " + filter.join(" AND ");
    }

    query += orderID
        ? " ORDER BY orders.date DESC, orders.statusID"
        : " GROUP BY orders.ID ORDER BY orders.date DESC, orders.statusID";

    connection.query(query, IDs, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            const orders = [];
            const index = {};

            results.forEach(row => {
                var ord = index[row.ID];
                if (!ord) {
                    ord = {
                        ID: row.ID,
                        date: row.date,
                        status: row.status,
                        address: row.address,
                        products: []
                    };
                    index[row.ID] = ord;
                    orders.push(ord);
                }

                if (row.productID !== undefined && !row.fatherID) {
                    ord.products.push({
                        ID: row.productID,
                        name: row.name,
                        price: row.price,
                        image: row.image,
                        quantity: row.quantity,
                        accessories: []
                    });
                }
            });

            if (orderID) {
                results
                    .filter(row => row.fatherID)
                    .forEach(acc => {
                        const parent = index[acc.ID].products.find(p => p.ID === acc.fatherID);
                        if (parent) {
                            parent.accessories.push({
                                ID: acc.productID,
                                name: acc.name,
                                price: acc.price,
                                quantity: acc.quantity
                            });
                        }
                    });
            }
            res.json(orders);
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

router.post('/upload', (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file ricevuto (campo atteso: "image")' });
        }

        res.status(201).json({
            message: 'Immagine caricata con successo',
            filename: req.file.filename,
            url: buildImageUrl(req, req.file.filename)
        });
    });
});

router.get('/products', (req, res) => { //  /products?categoryID=1
    const categoryID = req.query.categoryID;
    let sql = `
        SELECT 
            products.ID, products.name, products.price, categories.category AS categoryName, products.productID
        FROM products
        LEFT JOIN categories ON products.categoryID = categories.ID`
    connection.query(sql, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });
});

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

router.put('/products/:productID', (req, res) => {
    const productID = req.params.productID;
    const { name, description, price, categoryID, image_path } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ error: 'name e price sono obbligatori' });
    }

    connection.query(
        'UPDATE products SET name = ?, description = ?, price = ?, categoryID = ? WHERE ID = ? AND active = 1',
        [name, description || null, price, categoryID || null, productID],
        (error, result) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante l\'aggiornamento del prodotto' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Prodotto non trovato o non attivo' });
            }

            if (image_path) {
                connection.query(
                    'SELECT ID FROM products_images WHERE productID = ? LIMIT 1',
                    [productID],
                    (imgError, imgResults) => {
                        if (imgError) {
                            console.error('Errore durante la verifica dell\'immagine:', imgError);
                            return res.json({ message: 'Prodotto aggiornato con successo' });
                        }

                        if (imgResults.length > 0) {
                            connection.query(
                                'UPDATE products_images SET image_path = ? WHERE ID = ?',
                                [image_path, imgResults[0].ID],
                                (updateImgErr) => {
                                    if (updateImgErr) {
                                        console.error('Errore durante l\'aggiornamento dell\'immagine:', updateImgErr);
                                    }
                                    res.json({ message: 'Prodotto e immagine aggiornati con successo' });
                                }
                            );
                        } else {
                            connection.query(
                                'INSERT INTO products_images (image_path, productID) VALUES (?, ?)',
                                [image_path, productID],
                                (insertImgErr) => {
                                    if (insertImgErr) {
                                        console.error('Errore durante l\'inserimento dell\'immagine:', insertImgErr);
                                    }
                                    res.json({ message: 'Prodotto e immagine aggiornati con successo' });
                                }
                            );
                        }
                    }
                );
            } else {
                res.json({ message: 'Prodotto aggiornato con successo' });
            }
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

router.put('/categories/:categoryID', (req, res) => {
    const categoryID = req.params.categoryID;
    const { category, image_path } = req.body;

    if (!category) {
        return res.status(400).json({ error: 'category è obbligatorio' });
    }

    connection.query(
        'UPDATE categories SET category = ? WHERE ID = ?',
        [category, categoryID],
        (error, result) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                return res.status(500).json({ error: 'Errore durante l\'aggiornamento della categoria' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Categoria non trovata' });
            }

            if (image_path) {
                connection.query(
                    'SELECT ID FROM category_images WHERE categoryID = ? LIMIT 1',
                    [categoryID],
                    (imgError, imgResults) => {
                        if (imgError) {
                            console.error('Errore durante la verifica dell\'immagine:', imgError);
                            return res.json({ message: 'Categoria aggiornata con successo' });
                        }

                        if (imgResults.length > 0) {
                            connection.query(
                                'UPDATE category_images SET image_path = ? WHERE ID = ?',
                                [image_path, imgResults[0].ID],
                                (updateImgErr) => {
                                    if (updateImgErr) {
                                        console.error('Errore durante l\'aggiornamento dell\'immagine:', updateImgErr);
                                    }
                                    res.json({ message: 'Categoria e immagine aggiornate con successo' });
                                }
                            );
                        } else {
                            connection.query(
                                'INSERT INTO category_images (image_path, categoryID) VALUES (?, ?)',
                                [image_path, categoryID],
                                (insertImgErr) => {
                                    if (insertImgErr) {
                                        console.error('Errore durante l\'inserimento dell\'immagine:', insertImgErr);
                                    }
                                    res.json({ message: 'Categoria e immagine aggiornate con successo' });
                                }
                            );
                        }
                    }
                );
            } else {
                res.json({ message: 'Categoria aggiornata con successo' });
            }
        }
    );
});

//#endregion

module.exports = router;