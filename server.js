const express = require('express');
const db = require('./config/db');
const app = express();
app.use(express.json());

const publicRoutes = require('./routes/publicCalls');
const userRoutes = require('./routes/userCalls');
const adminRoutes = require('./routes/adminCalls');

app.use('/api/public', publicRoutes);
app.use('/api/utente', userRoutes);
app.use('api/adm/', adminRoutes);

app.listen(3000, () => {
    console.log('Server avviato su http://localhost:3000');
});