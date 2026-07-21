(() => {
  const grid = document.querySelector('[data-editorial-grid]');
  if (!grid) return;

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  const renderItem = (item) => {
    const description = item.descripcion ? `<p class="editorial-card__description">${escapeHtml(item.descripcion)}</p>` : '';
    const note = item.nota ? `<p class="editorial-card__note">${escapeHtml(item.nota)}</p>` : '';
    return `
      <article class="editorial-card">
        <a class="editorial-card__image" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir publicación original en ${escapeHtml(item.medio)}">
          <img src="${escapeHtml(item.imagen)}" alt="Captura de la publicación ${escapeHtml(item.titulo)} en ${escapeHtml(item.medio)}" loading="lazy" decoding="async">
        </a>
        <div class="editorial-card__body">
          <p class="editorial-card__meta"><span>${escapeHtml(item.medio)}</span><span>${escapeHtml(item.pais)} · ${escapeHtml(item.anio)}</span></p>
          <h2>${escapeHtml(item.titulo)}</h2>
          ${description}
          <p class="editorial-card__credit">Crédito: ${escapeHtml(item.credito)}</p>
          ${note}
          <a class="editorial-card__link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Ver publicación original <span aria-hidden="true">↗</span></a>
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
