(() => {
  const grid = document.querySelector('[data-editorial-grid]');
  if (!grid) return;

  const STORAGE_VIEW_KEY = 'mlopezmad.editorialArchive.view.v366';
  const viewButtons = [...document.querySelectorAll('[data-editorial-view]')];

  const getStoredView = () => {
    try { return localStorage.getItem(STORAGE_VIEW_KEY) === 'compacta' ? 'compacta' : 'editorial'; }
    catch (_) { return 'editorial'; }
  };

  const applyView = view => {
    const safeView = view === 'compacta' ? 'compacta' : 'editorial';
    grid.classList.toggle('editorial-archive__grid--compact', safeView === 'compacta');
    grid.dataset.view = safeView;
    viewButtons.forEach(button => {
      const active = button.dataset.editorialView === safeView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  viewButtons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.editorialView === 'compacta' ? 'compacta' : 'editorial';
      try { localStorage.setItem(STORAGE_VIEW_KEY, view); } catch (_) {}
      applyView(view);
    });
  });

  applyView(getStoredView());

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  const renderMedia = (item, itemIndex) => {
    const images = Array.isArray(item.imagenes) && item.imagenes.length
      ? item.imagenes
      : item.imagen
        ? [{ src: item.imagen, alt: `Captura de la publicación ${item.titulo} en ${item.medio}` }]
        : [];

    if (!images.length) return '';

    const slides = images.map((image, imageIndex) => {
      const content = `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || `Documento ${imageIndex + 1} de ${item.titulo}`)}" loading="lazy" decoding="async">`;
      const inner = item.url
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir publicación original en ${escapeHtml(item.medio)}">${content}</a>`
        : content;
      return `<div class="editorial-card__slide" data-editorial-slide aria-hidden="${imageIndex === 0 ? 'false' : 'true'}">${inner}</div>`;
    }).join('');

    const controls = images.length > 1 ? `
      <div class="editorial-card__media-controls" aria-label="Imágenes de la publicación">
        <button type="button" data-editorial-prev aria-label="Imagen anterior">←</button>
        <span data-editorial-counter>1 / ${images.length}</span>
        <button type="button" data-editorial-next aria-label="Imagen siguiente">→</button>
      </div>` : '';

    return `<div class="editorial-card__image${images.length > 1 ? ' editorial-card__image--multiple' : ''}" data-editorial-media="${itemIndex}">${slides}${controls}</div>`;
  };

  const renderItem = (item, index) => {
    const description = item.descripcion ? `<p class="editorial-card__description">${escapeHtml(item.descripcion)}</p>` : '';
    const note = item.nota ? `<p class="editorial-card__note">${escapeHtml(item.nota)}</p>` : '';
    const type = item.tipo ? `<p class="editorial-card__type">${escapeHtml(item.tipo)}</p>` : '';
    const link = item.url
      ? `<a class="editorial-card__link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Ver publicación original <span aria-hidden="true">↗</span></a>`
      : '';

    return `
      <article class="editorial-card">
        ${renderMedia(item, index)}
        <div class="editorial-card__body">
          <p class="editorial-card__meta"><span>${escapeHtml(item.medio)}</span><span>${escapeHtml(item.pais)} · ${escapeHtml(item.anio)}</span></p>
          ${type}
          <h2>${escapeHtml(item.titulo)}</h2>
          ${description}
          <p class="editorial-card__credit">Crédito: ${escapeHtml(item.credito)}</p>
          ${note}
          ${link}
        </div>
      </article>`;
  };

  const activateCarousels = () => {
    grid.querySelectorAll('[data-editorial-media]').forEach(media => {
      const slides = [...media.querySelectorAll('[data-editorial-slide]')];
      if (slides.length < 2) return;
      const counter = media.querySelector('[data-editorial-counter]');
      let current = 0;

      const show = next => {
        current = (next + slides.length) % slides.length;
        slides.forEach((slide, index) => {
          const active = index === current;
          slide.classList.toggle('is-active', active);
          slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        });
        if (counter) counter.textContent = `${current + 1} / ${slides.length}`;
      };

      media.querySelector('[data-editorial-prev]')?.addEventListener('click', () => show(current - 1));
      media.querySelector('[data-editorial-next]')?.addEventListener('click', () => show(current + 1));
      show(0);
    });
  };

  fetch('data/archivo-editorial.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('No se ha podido cargar el archivo editorial.');
      return response.json();
    })
    .then(items => {
      const orderedItems = [...items].sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
      grid.innerHTML = orderedItems.map(renderItem).join('');
      activateCarousels();
      applyView(getStoredView());
      grid.removeAttribute('aria-busy');
    })
    .catch(() => {
      grid.innerHTML = '<p class="editorial-archive__error">No se ha podido cargar el archivo. Inténtalo de nuevo más tarde.</p>';
      grid.removeAttribute('aria-busy');
    });
})();
