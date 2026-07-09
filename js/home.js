(function(){
  const coverImg = document.getElementById('homeCover');
  const featuredGrid = document.getElementById('featuredGrid');
  const statPhotos = document.getElementById('statPhotos');
  const statSeries = document.getElementById('statSeries');
  const statLatestLink = document.getElementById('statLatestLink');
  const statLatestTitle = document.getElementById('statLatestTitle');

  const cacheBust = String(Date.now());
  const recentKey = 'mlopezmad.hero.recent.v351';
  const heroCandidatesUrl = `data/hero-candidates.json?t=${cacheBust}`;

  let homeData = null;
  let collectionsData = null;
  let heroCandidateData = null;
  let allCollections = [];
  let lastViewportMode = window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';

  function isMobileViewport(){
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function currentMode(){
    return isMobileViewport() ? 'mobile' : 'desktop';
  }

  function selectedHeroSource(home){
    if(!home) return '';
    const isMobile = isMobileViewport();
    return isMobile
      ? (home.mobileSource || home.phoneSource || home.source || home.desktopSource || '')
      : (home.source || home.desktopSource || home.mobileSource || home.phoneSource || '');
  }

  function warmImage(src, priority){
    if(!src) return;
    const img = new Image();
    img.decoding = 'async';
    if('fetchPriority' in img) img.fetchPriority = priority ? 'high' : 'low';
    img.src = src;
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
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
    const isMobile = isMobileViewport();
    const source = selectedHeroSource(home);

    const composition = isMobile
      ? ((home.mobileComposition && (home.mobileComposition.mobile || home.mobileComposition.desktop)) || (home.composition && (home.composition.mobile || home.composition.desktop)))
      : (home.composition && (home.composition.desktop || home.composition.mobile));

    const objectPosition = isMobile
      ? (home.mobileObjectPosition || home.objectPosition)
      : (home.desktopObjectPosition || home.objectPosition);

    const paint = () => {
      if(composition){
        const value = coverSafeValue(img, composition);
        img.classList.add('cover-composed');
        img.style.objectPosition = 'center center';
        img.style.transformOrigin = 'center center';
        img.style.transform = `translate(-50%, -50%) translate(${value.x}%, ${value.y}%) scale(${value.scale})`;
      }else{
        img.classList.remove('cover-composed');
        img.style.transform = '';
        img.style.transformOrigin = '';
        img.style.objectPosition = objectPosition ? `${objectPosition.x}% ${objectPosition.y}%` : 'center center';
      }
      img.classList.add('is-ready');
    };

    if(source && img.getAttribute('src') !== source){
      img.classList.remove('is-ready');
      img.loading = 'eager';
      img.decoding = 'async';
      if('fetchPriority' in img) img.fetchPriority = 'high';
      img.onload = paint;
      img.onerror = () => img.classList.add('is-ready');
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

  function withHomeOrigin(url){
    if(!url) return 'portfolio.html';
    const hashIndex = url.indexOf('#');
    const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}from=home${hash}`;
  }

  async function fetchJson(url, options){
    const response = await fetch(url, options || {});
    if(!response.ok) throw new Error(`No se pudo cargar ${url}`);
    return response.json();
  }

  async function countPhotos(collection){
    try{
      const data = await fetchJson(`${collection.json}?t=${cacheBust}`, {cache:'no-store'});
      const images = (data.imagenes || []).map(item => item.archivo || item.file || '').filter(Boolean);
      return {count: images.length, first: images[0] || '', images};
    }catch(e){
      return {count:null, first:'', images:[]};
    }
  }

  function readRecentHeroSources(){
    try{
      const parsed = JSON.parse(localStorage.getItem(recentKey) || '[]');
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    }catch(e){
      return [];
    }
  }

  function rememberHeroSource(source, total){
    if(!source) return;
    try{
      const recent = readRecentHeroSources().filter(item => item !== source);
      const limit = Math.max(8, Math.min(28, Math.floor((total || 1) / 3)));
      localStorage.setItem(recentKey, JSON.stringify([source, ...recent].slice(0, limit)));
    }catch(e){}
  }

  function weightedPick(items){
    if(!items.length) return null;
    const weights = items.map((item) => Math.max(1, Number(item.score || 50) - 18));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let marker = Math.random() * total;
    for(let i = 0; i < items.length; i++){
      marker -= weights[i];
      if(marker <= 0) return items[i];
    }
    return items[0];
  }

  function fallbackHero(data){
    const cover = data && data.homeCover ? data.homeCover : {};
    return {
      source: cover.source || 'images/portada.jpg',
      desktopSource: cover.source || cover.desktopSource || 'images/portada.jpg',
      mobileSource: cover.mobileSource || cover.phoneSource || cover.source || 'images/portada.jpg',
      composition: cover.composition || null,
      mobileComposition: cover.mobileComposition || null,
      objectPosition: cover.objectPosition || {x:50, y:50},
      url: 'portfolio.html'
    };
  }

  function normalizeHeroCandidate(candidate, fallback){
    const mode = currentMode();
    const position = candidate.objectPosition || fallback.objectPosition || {x:50, y:50};
    return {
      ...fallback,
      ...candidate,
      source: candidate.source || candidate.desktopSource || fallback.source,
      desktopSource: candidate.desktopSource || candidate.source || fallback.desktopSource || fallback.source,
      mobileSource: candidate.mobileSource || candidate.source || fallback.mobileSource || fallback.source,
      composition: null,
      mobileComposition: null,
      desktopObjectPosition: mode === 'desktop' ? position : undefined,
      mobileObjectPosition: mode === 'mobile' ? position : undefined,
      objectPosition: position
    };
  }

  function pickPrecomputedHero(config, data){
    const fallback = normalizeHeroCandidate(
      (config && config.fallback) || {},
      fallbackHero(data)
    );

    const mode = currentMode();
    const pool = config && Array.isArray(config[mode]) ? config[mode].filter(item => item && item.source) : [];
    if(!pool.length) return fallback;

    const recent = readRecentHeroSources();
    const visiblePool = pool.filter(item => !recent.includes(item.source));
    const candidatePool = visiblePool.length ? visiblePool : pool;
    const picked = weightedPick(candidatePool) || candidatePool[0];
    const hero = normalizeHeroCandidate(picked, fallback);
    rememberHeroSource(hero.source, pool.length);
    return hero;
  }

  function cardTemplate(collection, cover, options){
    const label = options.label || 'Serie';
    const large = options.large ? ' feature-card--large' : '';
    const text = collection.subtitle || collection.description || 'Fotografía de calle';
    return `
      <a class="feature-card${large}" href="${withHomeOrigin(collection.url)}">
        <div class="feature-card__image">${cover ? `<img src="${cover}" alt="${escapeHtml(collection.title)}" loading="lazy" decoding="async" fetchpriority="low">` : ''}</div>
        <div class="feature-card__content">
          <span class="feature-label">${escapeHtml(label)}</span>
          <h3>${escapeHtml(collection.title)}</h3>
          ${text ? `<p>${escapeHtml(text)}</p>` : ''}
        </div>
      </a>`;
  }

  async function loadHome(){
    try{
      const [data, heroConfig] = await Promise.all([
        fetchJson(`collections.json?t=${cacheBust}`, {cache:'no-store'}),
        fetchJson(heroCandidatesUrl, {cache:'no-store'}).catch(() => null)
      ]);

      collectionsData = data;
      heroCandidateData = heroConfig;
      allCollections = data.collections || [];

      homeData = pickPrecomputedHero(heroCandidateData, collectionsData);
      warmImage(selectedHeroSource(homeData), true);
      applyComposition(coverImg, homeData);

      const countMap = await Promise.all(allCollections.map(countPhotos));
      const portfolio = allCollections.filter(c => c.type === 'portfolio');
      const publicCollections = portfolio.filter(c => c.id !== 'hall-of-fame');
      const latest = publicCollections[publicCollections.length - 1] || portfolio[portfolio.length - 1];

      const total = countMap.reduce((sum, item) => sum + (Number.isFinite(item.count) ? item.count : 0), 0);
      if(statPhotos) statPhotos.textContent = total ? `${total}+` : '—';
      if(statSeries) statSeries.textContent = String(publicCollections.length || portfolio.length || '—');
      if(statLatestLink && latest && latest.url) statLatestLink.setAttribute('href', withHomeOrigin(latest.url));
      if(statLatestTitle) statLatestTitle.textContent = latest && latest.title ? latest.title : 'Portfolio';

      const byId = Object.fromEntries(allCollections.map(c => [c.id, c]));
      const hall = byId['hall-of-fame'] || portfolio[0];
      const madrid = byId['madrid'] || publicCollections[0];
      const hands = byId['hands'] || latest;

      const targetById = Object.fromEntries(allCollections.map((c, index) => [c.id, {collection:c, details:countMap[index] || {}}]));
      const targetData = [hall, madrid, hands].filter(Boolean).map(c => {
        const details = (targetById[c.id] && targetById[c.id].details) || {};
        return {collection:c, cover:collectionCover(c, details.first)};
      });

      const html = [];
      if(targetData[0]) html.push(cardTemplate(targetData[0].collection, targetData[0].cover, {label:'Selección del autor', large:true}));
      if(targetData[1]) html.push(cardTemplate(targetData[1].collection, targetData[1].cover, {label:'Serie'}));
      if(targetData[2]) html.push(cardTemplate(targetData[2].collection, targetData[2].cover, {label:'Última publicación'}));
      html.push(`
        <a class="feature-card feature-card--about" href="sobre-mi.html">
          <div class="feature-card__image"><img src="images/about/profile.jpg" alt="Miguel Ángel López" loading="lazy" decoding="async" fetchpriority="low"></div>
          <div class="feature-card__content">
            <span class="feature-label">Sobre la mirada</span>
            <h3>Miguel Ángel López</h3>
            <p>La afición me llevó al ámbito profesional. Hoy vuelvo a ella desde una mirada más personal.</p>
          </div>
        </a>`);

      if(featuredGrid) featuredGrid.innerHTML = html.join('');
    }catch(error){
      homeData = fallbackHero(collectionsData || {});
      applyComposition(coverImg, homeData);
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

  let resizeTimer = null;
  function handleResize(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const mode = currentMode();
      if(mode !== lastViewportMode){
        lastViewportMode = mode;
        homeData = pickPrecomputedHero(heroCandidateData, collectionsData || {});
      }
      if(homeData) applyComposition(coverImg, homeData);
    }, 160);
  }

  loadHome();
  window.addEventListener('resize', handleResize, {passive:true});
})();
