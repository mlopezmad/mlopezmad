(function(){
  const nav = document.getElementById('mainNav');
  const menuButton = document.querySelector('.mobile-menu-button');
  const coverImg = document.getElementById('homeCover');
  const featuredGrid = document.getElementById('featuredGrid');
  const latestLink = document.getElementById('latestPublicationLink');
  const statPhotos = document.getElementById('statPhotos');
  const statSeries = document.getElementById('statSeries');

  if(menuButton && nav){
    menuButton.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });
  }

  function coverSafeValue(img, value){
    const parent = img && img.parentElement;
    if(!img || !parent || !img.naturalWidth || !img.naturalHeight) return value || {x:0,y:0,scale:1};
    const rect = parent.getBoundingClientRect();
    if(!rect.width || !rect.height) return value || {x:0,y:0,scale:1};
    const imageRatio = img.naturalWidth / img.naturalHeight;
    const frameRatio = rect.width / rect.height;
    let baseW, baseH;
    if(imageRatio >= frameRatio){ baseW = rect.width; baseH = rect.width / imageRatio; }
    else { baseH = rect.height; baseW = rect.height * imageRatio; }
    const minScale = Math.max(rect.width / baseW, rect.height / baseH, 1);
    const scale = Math.max(Number(value && value.scale || 1), minScale);
    const maxX = Math.max(0, ((baseW * scale - rect.width) / 2) / baseW * 100);
    const maxY = Math.max(0, ((baseH * scale - rect.height) / 2) / baseH * 100);
    const x = Math.min(maxX, Math.max(-maxX, Number(value && value.x || 0)));
    const y = Math.min(maxY, Math.max(-maxY, Number(value && value.y || 0)));
    return { x, y, scale };
  }

  function applyComposition(img, home){
    if(!img || !home) return;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const source = isMobile
      ? (home.mobileSource || home.phoneSource || home.source || home.desktopSource)
      : (home.source || home.desktopSource || home.mobileSource || home.phoneSource);

    const composition = isMobile
      ? ((home.mobileComposition && (home.mobileComposition.mobile || home.mobileComposition.desktop)) || (home.composition && (home.composition.mobile || home.composition.desktop)))
      : (home.composition && (home.composition.desktop || home.composition.mobile));

    const paint = () => {
      if(composition){
        const value = coverSafeValue(img, composition);
        img.classList.add('cover-composed');
        img.style.transformOrigin = 'center center';
        img.style.transform = `translate(-50%, -50%) translate(${value.x}%, ${value.y}%) scale(${value.scale})`;
      }else{
        img.classList.remove('cover-composed');
        img.style.transform = '';
      }
    };

    if(source && img.getAttribute('src') !== source){
      img.onload = paint;
      img.setAttribute('src', source);
    }else if(!img.complete || !img.naturalWidth){
      img.onload = paint;
    }else{
      paint();
    }
  }

  function collectionCover(collection, firstPhoto){
    if(collection.cover){
      return String(collection.cover).startsWith('images/') ? collection.cover : `${collection.path}/${collection.cover}`;
    }
    if(firstPhoto) return `${collection.path}/${firstPhoto}`;
    return '';
  }

  function escapeHtml(text){
    return String(text || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }

  async function countPhotos(collection){
    try{
      const response = await fetch(`${collection.json}?t=${Date.now()}`, {cache:'no-store'});
      const data = await response.json();
      const images = data.imagenes || [];
      return {count: images.length, first: images[0] ? (images[0].archivo || images[0].file || '') : ''};
    }catch(e){
      return {count:null, first:''};
    }
  }

  function cardTemplate(collection, cover, options){
    const label = options.label || 'Serie';
    const large = options.large ? ' feature-card--large' : '';
    const text = collection.subtitle || collection.description || 'Fotografía de calle';
    return `
      <a class="feature-card${large}" href="${collection.url}">
        <div class="feature-card__image">${cover ? `<img src="${cover}?t=${Date.now()}" alt="${escapeHtml(collection.title)}">` : ''}</div>
        <div class="feature-card__content">
          <span class="feature-label">${escapeHtml(label)}</span>
          <h3>${escapeHtml(collection.title)}</h3>
          ${text ? `<p>${escapeHtml(text)}</p>` : ''}
        </div>
      </a>`;
  }

  async function loadHome(){
    try{
      const response = await fetch(`collections.json?t=${Date.now()}`, {cache:'no-store'});
      const data = await response.json();
      applyComposition(coverImg, data.homeCover || {});

      const all = data.collections || [];
      const portfolio = all.filter(c => c.type === 'portfolio');
      const publicCollections = portfolio.filter(c => c.id !== 'hall-of-fame');
      const latest = publicCollections[publicCollections.length - 1] || portfolio[portfolio.length - 1];
      if(latestLink && latest && latest.url) latestLink.setAttribute('href', latest.url);

      const counts = await Promise.all(all.map(countPhotos));
      const total = counts.reduce((sum, item) => sum + (Number.isFinite(item.count) ? item.count : 0), 0);
      if(statPhotos) statPhotos.textContent = total ? `${total}+` : '—';
      if(statSeries) statSeries.textContent = String(publicCollections.length || portfolio.length || '—');

      const byId = Object.fromEntries(all.map(c => [c.id, c]));
      const hall = byId['hall-of-fame'] || portfolio[0];
      const madrid = byId['madrid'] || publicCollections[0];
      const hands = byId['hands'] || latest;

      const targets = [hall, madrid, hands].filter(Boolean);
      const targetData = await Promise.all(targets.map(async c => {
        const details = await countPhotos(c);
        return {collection:c, cover:collectionCover(c, details.first)};
      }));

      const html = [];
      if(targetData[0]) html.push(cardTemplate(targetData[0].collection, targetData[0].cover, {label:"Editor's Choice", large:true}));
      if(targetData[1]) html.push(cardTemplate(targetData[1].collection, targetData[1].cover, {label:'Serie'}));
      if(targetData[2]) html.push(cardTemplate(targetData[2].collection, targetData[2].cover, {label:'Última publicación'}));
      html.push(`
        <a class="feature-card feature-card--text" href="sobre-mi.html">
          <div class="feature-card__content">
            <span class="feature-label">Sobre la mirada</span>
            <h3>Más intención editorial.</h3>
            <p>Una web más cercana al nuevo lenguaje visual del ecosistema mlopezmad.</p>
          </div>
        </a>`);

      if(featuredGrid) featuredGrid.innerHTML = html.join('');
    }catch(error){
      if(featuredGrid){
        featuredGrid.innerHTML = `
          <a class="feature-card feature-card--large" href="portfolio.html">
            <div class="feature-card__content">
              <span class="feature-label">Portfolio</span>
              <h3>Archivo fotográfico</h3>
              <p>No se pudo cargar la selección dinámica. El portfolio sigue disponible.</p>
            </div>
          </a>`;
      }
    }
  }

  loadHome();
  window.addEventListener('resize', () => loadHome());
})();
