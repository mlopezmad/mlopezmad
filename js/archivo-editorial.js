(() => {
  const grid = document.querySelector('[data-editorial-grid]');
  if (!grid) return;

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  const renderItem = (item) => {
    const note = item.nota ? `<p class="editorial-card__note">${escapeHtml(item.nota)}</p>` : '';
    const image = `<img src="${escapeHtml(item.imagen)}" alt="Captura de la publicación ${escapeHtml(item.titulo)} en ${escapeHtml(item.medio)}" loading="lazy" decoding="async">`;
    const imageBlock = item.url ? `<a class="editorial-card__image" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir publicación original en ${escapeHtml(item.medio)}">${image}</a>` : `<div class="editorial-card__image">${image}</div>`;
    const link = item.url ? `<a class="editorial-card__link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Ver publicación original <span aria-hidden="true">↗</span></a>` : '';
    return `
      <article class="editorial-card">
        ${imageBlock}
        <div class="editorial-card__body">
          <p class="editorial-card__meta"><span>${escapeHtml(item.medio)}</span><span>${escapeHtml(item.pais)} · ${escapeHtml(item.anio)}</span></p>
          <h2>${escapeHtml(item.titulo)}</h2>
          <p class="editorial-card__credit">Crédito: ${escapeHtml(item.credito)}</p>
          ${note}
          ${link}
        </div>
      </article>`;
  };

  fetch('data/archivo-editorial.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('No se ha podido cargar el archivo editorial.');
      return response.json();
    })
    .then(items => {
      grid.innerHTML = items.map(renderItem).join('');
      grid.removeAttribute('aria-busy');
    })
    .catch(() => {
      grid.innerHTML = '<p class="editorial-archive__error">No se ha podido cargar el archivo. Inténtalo de nuevo más tarde.</p>';
      grid.removeAttribute('aria-busy');
    });
})();
