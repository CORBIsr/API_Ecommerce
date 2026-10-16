require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const cors = require('cors'); // cors
const app = express();
const path = require('path');

app.use(cors());// cors
app.use(express.json({
    // Conserva il corpo grezzo della richiesta: serve al webhook GitHub per
    // verificare la firma HMAC prima che express.json() lo trasformi in oggetto.
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

const publicRoutes = require('./routes/publicCalls');
const userRoutes = require('./routes/userCalls');
const adminRoutes = require('./routes/adminCalls');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');

const tokenVerifier = require('./middleware/auth')
const isInRole = require('./middleware/roles');

app.get('/api/', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-docs.html'));
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/public', publicRoutes);
app.use('/api/user', tokenVerifier, userRoutes);
app.use('/api/adm', tokenVerifier, isInRole(+process.env.ADMIN_ROLE, +process.env.OWNER_ROLE), adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});