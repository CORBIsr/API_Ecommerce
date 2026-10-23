// Filtro rapido di ricerca per sidebar ed endpoint
const searchInput = document.getElementById('searchInput');
const cards = document.querySelectorAll('.api-card');
const navItems = document.querySelectorAll('.nav-links li');

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(query)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });

    navItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});

// Copia snippet: un solo listener delegato invece di un onclick su ogni bottone
// (gli handler inline sarebbero bloccati dalla Content-Security-Policy)
function copySnippet(btn) {
    const code = btn.closest('.code-container').querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copiato!';
        btn.style.color = '#38bdf8';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.color = '';
        }, 1800);
    });
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-copy');
    if (btn) {
        copySnippet(btn);
    }
});
