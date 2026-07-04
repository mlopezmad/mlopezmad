(function(){
  const container = document.getElementById('portfolioList');
  if(!container) return;
  const cacheBust = String(Date.now());

  function escapeHtml(text){
    return String(text || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }

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
        url:'editors-choice.html',
        title:"Editor's Choice",
        description:'Una selección personal de fotografías que resumen la mirada.',
        meta:'Selección del autor',
        cover:'images/hall-of-fame/baile-madrid.jpg',
        priority:false
      }));

      cards.push(card({
        url:'iphone4s.html',
        title:'iPhone 4s',
        description:'Transfer Filter Project',
        meta:'Proyecto personal',
        cover:'images/iphone4s/hero.jpg',
        priority:false
      }));

      container.innerHTML = `<div class="portfolio-grid">${cards.join('')}</div>`;
    }catch(error){
      container.innerHTML = '<p class="portfolio-empty">No se pudo cargar el portfolio.</p>';
    }
  }

  loadPortfolio();
})();
