// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Limita i tentativi di login per IP: rallenta gli attacchi a forza bruta sulle password
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Troppi tentativi di login, riprova tra qualche minuto' }
});

// Limita le registrazioni per IP: rallenta la creazione automatica di account falsi
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Troppe registrazioni da questo indirizzo, riprova più tardi' }
});

module.exports = { loginLimiter, registerLimiter };
