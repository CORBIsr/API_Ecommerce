const express = require('express');
const router = express.Router();

const connection = require('../config/db');

//#region products

router.get('/products', (req, res) => {
    const categoryID = req.query.categoryID;
    if (categoryID) {
        connection.query(`
            SELECT p.ID, p.name, p.description, p.price,
                ( SELECT products_images.image_path FROM products_images WHERE products_images.productID = p.ID LIMIT 1 ) AS image
            FROM products p
            WHERE p.productID IS NULL AND p.categoryID = ?
        `, [categoryID], (error, results, fields) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
            } else {
                res.json(results);
            }
        });
    } else {
        connection.query(`
            SELECT p.ID, p.name, p.description, p.price,
                ( SELECT products_images.image_path FROM products_images WHERE products_images.productID = p.ID LIMIT 1 ) AS image
            FROM products p
            WHERE p.productID IS NULL;
        `, (error, results, fields) => {
            if (error) {
                console.error('Errore durante l\'esecuzione della query:', error);
                res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
            } else {
                res.json(results);
            }
        });
    }
});

router.get('/products/:productID', (req, res) => {
    const productID = req.params.productID;
    connection.query(`
        SELECT products.ID, products.name, products.description, products_images.image_path AS image
        FROM products
        INNER JOIN products_images ON products_images.productID = products.ID
        WHERE products.ID = ?;
    `, [productID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            var prod = {
                id: results[0].ID,
                name: results[0].name,
                description: results[0].description,
                images: []
            }
            results.forEach(result => {
                prod.images.push(result.image)
            });
            res.json(prod);
        }
    });
});

router.get('/accessories/:productID', (req, res) => {
    const productID = req.params.productID;
    connection.query('SELECT ID, name, price FROM products WHERE productID = ?;', [productID], (error, results, fields) => {
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
        SELECT categories.ID, categories.category, category_images.image_path AS image
        FROM categories
        INNER JOIN category_images ON category_images.categoryID = categories.ID;
    `, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });
});

//#endregion

module.exports = router;