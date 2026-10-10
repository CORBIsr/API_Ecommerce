function adminRole(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Utente non autenticato' });
    }
    
    const ADMIN_ROLE = 1;

    if (req.user.role !== ADMIN_ROLE) {
        return res.status(403).json({ error: 'Accesso negato: privilegi di amministratore richiesti' });
    }
    next();
}
module.exports = adminRole;