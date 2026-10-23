require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const cors = require('cors'); // cors
const helmet = require('helmet');
const app = express();
const path = require('path');

app.disable('x-powered-by');

// Origini del frontend ammesse a chiamare le API da browser (credenziali escluse: il token va nell'header Authorization, non nei cookie)
const allowedOrigins = [
    'https://internopuro.alwaysdata.net',
    'http://localhost:5173'
];
app.use(cors({ origin: allowedOrigins }));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            // CSS e JS di api-docs.html sono file esterni (/assets), niente inline da permettere
            "style-src": ["'self'"]
        }
    }
}));

app.use(express.json());

const publicRoutes = require('./routes/publicCalls');
const userRoutes = require('./routes/userCalls');
const adminRoutes = require('./routes/adminCalls');
const authRoutes = require('./routes/auth');

const tokenVerifier = require('./middleware/auth')
const isInRole = require('./middleware/roles');

app.get('/api/', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-docs.html'));
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Sotto /api perché /assets è già usato dal frontend React per i propri file compilati
// (il proxy di alwaysdata instraderebbe altrimenti queste richieste al frontend, non a Node)
app.use('/api/assets', express.static(path.join(__dirname, 'public')));

app.use('/api/public', publicRoutes);
app.use('/api/user', tokenVerifier, userRoutes);
app.use('/api/adm', tokenVerifier, isInRole(+process.env.ADMIN_ROLE, +process.env.OWNER_ROLE), adminRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});