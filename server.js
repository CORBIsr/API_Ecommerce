require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const cors = require('cors'); // cors
const app = express();

app.use(cors());// cors
app.use(express.json());

const publicRoutes = require('./routes/publicCalls');
const userRoutes = require('./routes/userCalls');
const adminRoutes = require('./routes/adminCalls');
const authRoutes = require('./routes/auth');

const tokenVerifier = require('./middleware/auth')
const adminRole = require('./middleware/roles')

app.use('/public', publicRoutes);
app.use('/user', tokenVerifier, userRoutes);
app.use('/adm', tokenVerifier, adminRole, adminRoutes);
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});