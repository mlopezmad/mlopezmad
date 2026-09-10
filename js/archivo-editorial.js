(() => {
  const grid = document.querySelector('[data-editorial-grid]');
  if (!grid) return;

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  const renderItem = (item) => {
    const translation = item.titulo_es && item.titulo_es !== item.titulo
      ? `<p class="editorial-card__translation"><span>En español</span>${escapeHtml(item.titulo_es)}</p>`
      : '';
    const description = item.descripcion
      ? `<p class="editorial-card__description">${escapeHtml(item.descripcion)}</p>`
      : '';
    const note = item.nota ? `<p class="editorial-card__note">${escapeHtml(item.nota)}</p>` : '';
    const carouselImages = Array.isArray(item.imagenes) && item.imagenes.length > 1 ? item.imagenes : null;
    const image = carouselImages
      ? `<div class="editorial-card__carousel" data-editorial-carousel>
          <div class="editorial-card__carousel-track">${carouselImages.map((src, index) => `<a class="editorial-card__image editorial-card__carousel-slide" href="${escapeHtml(item.url || src)}"${item.url ? ' target="_blank" rel="noopener noreferrer"' : ''} aria-label="${item.url ? `Abrir publicación original en ${escapeHtml(item.medio)}` : `Ver imagen ${index + 1}`}"><img src="${escapeHtml(src)}" alt="${index === 0 ? `Fotografía publicada en ${escapeHtml(item.medio)}` : `Documento ${index + 1} de ${escapeHtml(item.medio)}`}" loading="lazy" decoding="async"></a>`).join('')}</div>
          <div class="editorial-card__carousel-ui"><button type="button" class="editorial-card__carousel-button" data-carousel-prev aria-label="Imagen anterior">←</button><span data-carousel-count>1 / ${carouselImages.length}</span><button type="button" class="editorial-card__carousel-button" data-carousel-next aria-label="Imagen siguiente">→</button></div>
        </div>`
      : item.imagen
        ? item.url
          ? `<a class="editorial-card__image" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir publicación original en ${escapeHtml(item.medio)}"><img src="${escapeHtml(item.imagen)}" alt="Captura de la publicación ${escapeHtml(item.titulo)} en ${escapeHtml(item.medio)}" loading="lazy" decoding="async"></a>`
          : `<div class="editorial-card__image"><img src="${escapeHtml(item.imagen)}" alt="Captura conservada de la publicación ${escapeHtml(item.titulo)} en ${escapeHtml(item.medio)}" loading="lazy" decoding="async"></div>`
        : `<div class="editorial-card__document" aria-label="Publicación verificada sin captura conservada"><span>${escapeHtml(item.medio)}</span><strong>Publicación verificada</strong><small>Captura no conservada</small></div>`;
    const link = item.url
      ? `<a class="editorial-card__link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Ver publicación original <span aria-hidden="true">↗</span></a>`
      : `<p class="editorial-card__archive-label">Captura de archivo conservada</p>`;

    return `
      <article class="editorial-card">
        ${image}
        <div class="editorial-card__body">
          <p class="editorial-card__meta"><span>${escapeHtml(item.medio)}</span><span>${escapeHtml(item.pais)} · ${escapeHtml(item.anio)}</span></p>
          <h2>${escapeHtml(item.titulo)}</h2>
          ${translation}
          <p class="editorial-card__credit">Crédito: ${escapeHtml(item.credito)}</p>
          ${description}
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
      grid.querySelectorAll('[data-editorial-carousel]').forEach(carousel => {
        const track = carousel.querySelector('.editorial-card__carousel-track');
        const slides = [...carousel.querySelectorAll('.editorial-card__carousel-slide')];
        const count = carousel.querySelector('[data-carousel-count]');
        const updateCount = () => {
          const width = track.clientWidth || 1;
          const index = Math.min(slides.length - 1, Math.max(0, Math.round(track.scrollLeft / width)));
          count.textContent = `${index + 1} / ${slides.length}`;
        };
        carousel.querySelector('[data-carousel-prev]').addEventListener('click', () => track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' }));
        carousel.querySelector('[data-carousel-next]').addEventListener('click', () => track.scrollBy({ left: track.clientWidth, behavior: 'smooth' }));
        track.addEventListener('scroll', updateCount, { passive: true });
        updateCount();
      });
      grid.removeAttribute('aria-busy');
    })
    .catch(() => {
      grid.innerHTML = '<p class="editorial-archive__error">No se ha podido cargar el archivo. Inténtalo de nuevo más tarde.</p>';
      grid.removeAttribute('aria-busy');
    });
})();
