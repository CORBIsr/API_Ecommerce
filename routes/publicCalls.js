const express = require('express');
const router = express.Router();

const connection = require('../config/db');

router.get('/prodotti', (req, res) => {
    const idCategoria = req.query.id_categoria;
    if(idCategoria){
        connection.query('SELECT p.id, p.nome, p.descrizione, p.prezzo, ( SELECT immagini_prodotti.path_immagine FROM immagini_prodotti WHERE immagini_prodotti.id_prodotti = p.id LIMIT 1 ) AS immagine FROM prodotti p WHERE p.id_prodotto IS NULL AND p.id_categoria = ?',[idCategoria], (error, results, fields) => {
        if (error) {
        console.error('Errore durante l\'esecuzione della query:', error);
        res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
        res.json(results);
        }
    });
    }else{
        connection.query('SELECT p.id, p.nome, p.descrizione, p.prezzo, ( SELECT immagini_prodotti.path_immagine FROM immagini_prodotti WHERE immagini_prodotti.id_prodotti = p.id LIMIT 1 ) AS immagine FROM prodotti p WHERE p.id_prodotto IS NULL;', (error, results, fields) => {
            if (error) {
              console.error('Errore durante l\'esecuzione della query:', error);
              res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
            } else {
              res.json(results);
            }
        });
    }
});

router.get('/prodotti/:id_prodotto', (req, res) => {
    const idProdotto = req.params.id_prodotto;
    connection.query('SELECT prodotti.id, prodotti.nome, prodotti.descrizione, immagini_prodotti.path_immagine AS immagine FROM prodotti INNER JOIN immagini_prodotti ON immagini_prodotti.id_prodotti = prodotti.id WHERE prodotti.id = ?;',[idProdotto], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            var prodotto = {
                id: results[0].id,
                nome: results[0].nome,
                descrizione: results[0].descrizione,
                immagini: []
            }
            results.forEach(result => {
                prodotto.immagini.push(result.immagine)
            });
            res.json(prodotto);
        }
    });
});

router.get('/categorie', (req, res) => {
    connection.query('SELECT categorie.id, categorie.categoria, immagini_categorie.path_immagine AS immagine FROM categorie INNER JOIN immagini_categorie ON immagini_categorie.id_categoria = categorie.id;', (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });
});

router.get('/accessori/:id_prodotto', (req, res) => {
    const idProdotto = req.params.id_prodotto;
    connection.query('SELECT id, nome, prezzo FROM prodotti WHERE id_prodotto = ?;',[idProdotto], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });
});

module.exports = router;