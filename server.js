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

app.listen(3000, () => {
    console.log('Server avviato su http://localhost:3000');
});