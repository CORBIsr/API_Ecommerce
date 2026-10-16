// routes/webhook.js
// Riceve i webhook di GitHub: ad ogni push sul branch main, aggiorna il codice
// (git pull + npm install) e riavvia il processo.
//
// Nel .env del server serve:
//   GITHUB_WEBHOOK_SECRET=<stringa segreta a scelta>
// La stessa stringa va inserita come "Secret" nel webhook configurato su GitHub
// (Settings > Webhooks del repository), così solo GitHub può richiamare questa rotta.
//
// Il riavvio avviene con process.exit(0): sul server, l'hosting Node deve essere
// configurato per riavviare automaticamente il processo quando termina (è il
// comportamento standard di alwaysdata per i siti Node.js). Verificarlo con un test.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const REPO_DIR = path.join(__dirname, '..');

function isValidSignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!signature || !secret || !req.rawBody) {
        return false;
    }

    const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

router.post('/github', (req, res) => {
    if (!isValidSignature(req)) {
        console.error('Webhook GitHub: firma non valida, richiesta rifiutata');
        return res.status(401).json({ error: 'Firma non valida' });
    }

    const event = req.headers['x-github-event'];

    if (event === 'ping') {
        return res.status(200).json({ message: 'pong' });
    }

    if (event !== 'push') {
        return res.status(200).json({ message: `Evento "${event}" ignorato` });
    }

    const branch = (req.body.ref || '').replace('refs/heads/', '');
    if (branch !== 'main') {
        return res.status(200).json({ message: `Push su "${branch}" ignorato, solo main attiva il deploy` });
    }

    res.status(202).json({ message: 'Deploy avviato' });

    console.log('Webhook GitHub: push su main ricevuto, eseguo git pull...');
    exec('git pull && npm install', { cwd: REPO_DIR }, (error, stdout, stderr) => {
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);

        if (error) {
            console.error('Deploy interrotto, il server NON viene riavviato:', error.message);
            return;
        }

        console.log('Deploy completato, riavvio il processo...');
        process.exit(0);
    });
});

module.exports = router;
