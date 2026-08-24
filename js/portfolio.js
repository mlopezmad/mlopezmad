(function(){
  const container = document.getElementById('portfolioList');
  if(!container) return;

  const cacheBust = String(Date.now());
  const STORAGE_VIEW_KEY = 'mlopezmad.portfolio.view.v360';
  const viewButtons = Array.from(document.querySelectorAll('[data-portfolio-view]'));

  function escapeHtml(text){
    return String(text || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }

  function getStoredView(){
    try{
      const value = localStorage.getItem(STORAGE_VIEW_KEY);
      return value === 'compacta' ? 'compacta' : 'editorial';
    }catch(error){
      return 'editorial';
    }
  }

  function setStoredView(view){
    try{ localStorage.setItem(STORAGE_VIEW_KEY, view); }catch(error){}
  }

  function applyView(view){
    const safeView = view === 'compacta' ? 'compacta' : 'editorial';
    container.classList.toggle('portfolio-list--compact', safeView === 'compacta');
    container.dataset.view = safeView;
    viewButtons.forEach(button => {
      const active = button.dataset.portfolioView === safeView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  viewButtons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.portfolioView === 'compacta' ? 'compacta' : 'editorial';
      setStoredView(view);
      applyView(view);
    });
  });

  applyView(getStoredView());

  function getCoverUrl(collection, firstPhoto){
    if(collection.cover){
      return String(collection.cover).startsWith('images/') ? collection.cover : `${collection.path}/${collection.cover}`;
    }
    return firstPhoto ? `${collection.path}/${firstPhoto}` : '';
  }

  function compositionStyle(composition){
    if(!composition) return '';
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const value = isMobile ? (composition.mobile || composition.desktop) : (composition.desktop || composition.mobile);
    if(!value) return '';
    const x = Number(value.x || 0);
    const y = Number(value.y || 0);
    const scale = Number(value.scale || 1);
    return `class="cover-composed" style="transform:translate(-50%, -50%) translate(${x}%, ${y}%) scale(${scale});transform-origin:center center;"`;
  }

  async function galleryInfo(collection){
    if(!collection.json) return {total:null, first:''};
    try{
      const response = await fetch(`${collection.json}?t=${cacheBust}`, {cache:'no-store'});
      const data = await response.json();
      const images = data.imagenes || [];
      return {total:images.length, first:images[0] ? (images[0].archivo || images[0].file || '') : ''};
    }catch(e){
      return {total:null, first:''};
    }
  }

  function card({url,title,description,meta,cover,composition,priority}){
    return `
      <a class="portfolio-item" href="${url}">
        <div class="portfolio-cover">
          ${cover ? `<img src="${cover}" alt="${escapeHtml(title)}" loading="${priority ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${priority ? 'high' : 'low'}" ${compositionStyle(composition)}>` : ''}
        </div>
        <div class="portfolio-content">
          <div class="portfolio-meta">${escapeHtml(meta)}</div>
          <h2>${escapeHtml(title)}</h2>
          ${description ? `<p>${escapeHtml(description)}</p>` : ''}
        </div>
      </a>`;
  }

  async function loadPortfolio(){
    try{
      const response = await fetch(`collections.json?t=${cacheBust}`, {cache:'no-store'});
      const data = await response.json();
      const collections = (data.collections || [])
        .filter(c => c.type === 'portfolio' && c.id !== 'hall-of-fame');

      if(!collections.length){
        container.innerHTML = '<p class="portfolio-empty">No hay colecciones disponibles.</p>';
        return;
      }

      const cards = await Promise.all(collections.map(async (collection, index) => {
        const info = await galleryInfo(collection);
        const totalText = info.total === null ? 'Abrir' : `${info.total} ${info.total === 1 ? 'fotografía' : 'fotografías'}`;
        const description = collection.subtitle || collection.description || '';
        const cover = getCoverUrl(collection, info.first);
        return card({
          url:collection.url,
          title:collection.title,
          description,
          meta:totalText,
          cover,
          composition:collection.coverComposition,
          priority:index < 2
        });
      }));

      cards.push(card({
        url:'iphone4s.html',
        title:'iPhone 4s',
        description:'Transfer Filter Project',
        meta:'Proyecto personal',
        cover:'images/iphone4s/hero.jpg',
        priority:false
      }));

      cards.push(card({
        url:'iphone-original.html',
        title:'iPhone original',
        description:'2007 · The First iPhone Project',
        meta:'Proyecto personal',
        cover:'images/iphone-original/hero.jpg',
        priority:false
      }));

      container.innerHTML = `<div class="portfolio-grid">${cards.join('')}</div>`;
      applyView(getStoredView());
    }catch(error){
      container.innerHTML = '<p class="portfolio-empty">No se pudo cargar el portfolio.</p>';
    }
  }

  loadPortfolio();
})();
