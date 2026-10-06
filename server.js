const express = require('express');
const mysql = require('mysql');
const { describe } = require('node:test');
require('dotenv').config();
const app = express();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
        console.error('Errore di connessione al database:', err);
    } else {
        console.log('Connessione al database riuscita');
    }
});

app.get('/api/prodotti', (req, res) => {
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

app.get('/api/prodotti/:id_prodotto', (req, res) => {
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

app.get('/api/categorie', (req, res) => {
    connection.query('SELECT categorie.id, categorie.categoria, immagini_categorie.path_immagine AS immagine FROM categorie INNER JOIN immagini_categorie ON immagini_categorie.id_categoria = categorie.id;', (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });
});

app.listen(3000, () => {
    console.log('Server avviato su http://localhost:3000');
});