const express = require('express');
const db = require('./config/db');
const app = express();
app.use(express.json());

const publicRoutes = require('./routes/publicCalls');
const userRoutes = require('./routes/userCalls');
const adminRoutes = require('./routes/adminCalls');
const authRoutes = require('./routes/auth');

const tokenVerifier = require('./middleware/auth')
const adminRole = require('./middleware/roles')

app.use('/api/public', publicRoutes);
app.use('/api/utente', tokenVerifier, userRoutes);
app.use('api/adm/', tokenVerifier, adminRole, adminRoutes);
app.use('/api/auth', authRoutes);

app.listen(3000, () => {
    console.log('Server avviato su http://localhost:3000');
});