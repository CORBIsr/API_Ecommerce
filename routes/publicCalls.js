const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const connection = require('../config/db');

//#region products

router.get('/products', (req, res) => { //  /products?categoryID=1
    const categoryID = req.query.categoryID;
    let sql = `
        SELECT 
            products.ID, products.name, products.description, products.price, categories.ID AS categoryID, categories.category AS categoryName,
            ( SELECT products_images.image_path FROM products_images WHERE products_images.productID = products.ID LIMIT 1 ) AS image
        FROM products
        LEFT JOIN categories ON products.categoryID = categories.ID
        WHERE products.productID IS NULL AND products.active = 1 ${categoryID ? `AND products.categoryID = ${categoryID}` : ""}`
    connection.query(sql, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            results.forEach(prod => {
                prod.image = `https://internopuro.alwaysdata.net/img/prods/${prod.image}`;
            });
            res.json(results);
        }
    });
});

router.get('/products/:productID', (req, res) => {
    const productID = req.params.productID;
    connection.query(`
        SELECT
            products.ID, products.name, products.description, products.price, categories.ID AS categoryID, categories.category AS categoryName, 
            products_images.ID AS imageID, products_images.image_path AS image
        FROM products
            LEFT JOIN products_images ON products_images.productID = products.ID
            LEFT JOIN categories ON products.categoryID = categories.ID
        WHERE products.ID = ?;
    `, [productID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            if (results.length === 0) {
                return res.status(404).json({ error: 'Prodotto non trovato' });
            }
            var prod = {
                ID: results[0].ID,
                name: results[0].name,
                price: results[0].price,
                categoryID: results[0].categoryID,
                categoryName: results[0].categoryName,
                description: results[0].description,
                images: []
            }
            results.forEach(result => {
                prod.images.push({
                    ID: result.imageID,
                    path: `https://internopuro.alwaysdata.net/img/prods/${result.image}`
                })
            });
            res.json(prod);
        }
    });
});

router.get('/accessories/:productID', (req, res) => {
    const productID = req.params.productID;
    connection.query(`
        SELECT
            ID, name, price 
        FROM products
        WHERE productID = ?;`, [productID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });
});

//#endregion

//#region categories

router.get('/categories', (req, res) => {
    connection.query(`
        SELECT 
            categories.ID, categories.category, category_images.ID as imageID, category_images.image_path AS image
        FROM categories
            INNER JOIN category_images ON category_images.categoryID = categories.ID;`, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            results.forEach(cat => {
                cat.image = `https://internopuro.alwaysdata.net/img/cats/${cat.image}`
            });
            res.json(results);
        }
    });
});

//#endregion

//#region users

router.post('/users', async (req, res) => {
    const { name, surname, username, password } = req.body;

    if (!name || !surname || !username || !password) {
        return res.status(400).json({ error: 'name, surname, username e password sono obbligatori' });
    }

    connection.query('SELECT ID FROM credentials WHERE username = ?', [username], async (error, existing) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            return res.status(500).json({ error: 'Errore durante la verifica dello username' });
        }
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Username già in uso' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            connection.beginTransaction((err) => {
                if (err) {
                    console.error('Errore avvio transazione:', err);
                    return res.status(500).json({ error: 'Errore interno del server' });
                }

                connection.query('INSERT INTO users (name, surname) VALUES (?, ?)', [name, surname], (error, userResult) => {
                    if (error) {
                        return connection.rollback(() => {
                            console.error('Errore durante la creazione dell\'utente:', error);
                            res.status(500).json({ error: 'Errore durante la creazione dell\'utente' });
                        });
                    }

                    const newUserID = userResult.insertId;

                    connection.query(
                        'INSERT INTO credentials (username, password, userID) VALUES (?, ?, ?)',
                        [username, hashedPassword, newUserID],
                        (error) => {
                            if (error) {
                                return connection.rollback(() => {
                                    console.error('Errore durante il salvataggio delle credenziali:', error);
                                    res.status(500).json({ error: 'Errore durante il salvataggio delle credenziali' });
                                });
                            }

                            connection.commit((err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        console.error('Errore durante il commit della transazione:', err);
                                        res.status(500).json({ error: 'Errore durante la conferma dei dati' });
                                    });
                                }

                                res.status(201).json({ message: 'Utente registrato con successo', userID: newUserID });
                            });
                        }
                    );
                });
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Errore durante la cifratura della password' });
        }
    });
});

//#endregion

module.exports = router;