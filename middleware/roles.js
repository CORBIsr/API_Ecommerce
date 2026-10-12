function isInRole(...roles) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({ error: 'Utente non autenticato' });
        }

        const numericRoles = roles.map(Number);
        const userRole = Number(req.user.role);

        const hasRole = numericRoles.includes(userRole);
        req.isInRole = hasRole;
        req.isOwner = userRole === +process.env.OWNER_ROLE;
        req.isAdmin = userRole === +process.env.ADMIN_ROLE;

        if (!hasRole) {
            return res.status(403).json({ error: 'Accesso negato: ruolo non autorizzato' });
        }

        next();
    };
}
module.exports = isInRole;