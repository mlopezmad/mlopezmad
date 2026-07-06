(function(){
  const coverImg = document.getElementById('homeCover');
  const featuredGrid = document.getElementById('featuredGrid');
  const statPhotos = document.getElementById('statPhotos');
  const statSeries = document.getElementById('statSeries');
  const statLatestLink = document.getElementById('statLatestLink');
  const statLatestTitle = document.getElementById('statLatestTitle');
  const cacheBust = String(Date.now());
  const recentKey = 'mlopezmad.hero.recent.v35';
  const metaKey = 'mlopezmad.hero.meta.v35';
  let homeData = null;
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
      const response = await fetch(`${collection.json}?t=${cacheBust}`, {cache:'no-store'});
      const data = await response.json();
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

  function readHeroMetaCache(){
    try{
      const parsed = JSON.parse(localStorage.getItem(metaKey) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    }catch(e){
      return {};
    }
  }

  function writeHeroMetaCache(cache){
    try{
      const entries = Object.entries(cache || {}).slice(-260);
      localStorage.setItem(metaKey, JSON.stringify(Object.fromEntries(entries)));
    }catch(e){}
  }

  function shuffle(list){
    const copy = list.slice();
    for(let i = copy.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function heroFrameRatio(){
    const hero = document.querySelector('.public-hero');
    const rect = hero && hero.getBoundingClientRect ? hero.getBoundingClientRect() : null;
    if(rect && rect.width && rect.height) return rect.width / rect.height;
    return isMobileViewport() ? 0.58 : 2.25;
  }

  function candidateSource(collection, filename){
    if(!filename) return '';
    return String(filename).startsWith('images/') ? filename : `${collection.path}/${filename}`;
  }

  function buildHeroCandidates(data, collections, counts){
    const seen = new Set();
    const candidates = [];

    collections.forEach((collection, index) => {
      if(!['portfolio','iphone4s'].includes(collection.type)) return;
      const details = counts[index] || {};
      const images = details.images && details.images.length ? details.images : [details.first || collection.cover].filter(Boolean);
      images.forEach((filename) => {
        const source = candidateSource(collection, filename);
        if(!source || seen.has(source)) return;
        if(!/\.(jpe?g|png|webp)$/i.test(source)) return;
        seen.add(source);
        candidates.push({
          source,
          desktopSource: source,
          mobileSource: source,
          collectionId: collection.id,
          title: collection.title,
          url: collection.url,
          composition: null,
          mobileComposition: null
        });
      });
    });

    if(data.homeCover && (data.homeCover.source || data.homeCover.mobileSource)){
      [data.homeCover.source, data.homeCover.mobileSource].filter(Boolean).forEach((source) => {
        if(seen.has(source)) return;
        seen.add(source);
        candidates.push({
          ...data.homeCover,
          source,
          desktopSource: source,
          mobileSource: source,
          title: 'Portada',
          url: 'portfolio.html'
        });
      });
    }

    return candidates;
  }

  function imageAnalysis(img){
    const fallback = {focusX:50, focusY:50, contrast:.45, brightness:.5, detail:.35};
    try{
      const size = 34;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', {willReadFrequently:true});
      if(!ctx) return fallback;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const gray = new Array(size * size);
      let sum = 0;
      for(let i = 0; i < size * size; i++){
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        const value = (r * .299 + g * .587 + b * .114) / 255;
        gray[i] = value;
        sum += value;
      }
      const mean = sum / gray.length;
      let variance = 0;
      let totalEnergy = 0;
      let weightedX = 0;
      let weightedY = 0;
      for(let y = 1; y < size - 1; y++){
        for(let x = 1; x < size - 1; x++){
          const index = y * size + x;
          variance += Math.pow(gray[index] - mean, 2);
          const dx = Math.abs(gray[index + 1] - gray[index - 1]);
          const dy = Math.abs(gray[index + size] - gray[index - size]);
          const centerBias = .75 + .25 * (1 - Math.min(1, Math.hypot((x / (size - 1)) - .5, (y / (size - 1)) - .5) / .707));
          const energy = (dx + dy) * centerBias;
          totalEnergy += energy;
          weightedX += energy * x;
          weightedY += energy * y;
        }
      }
      const focusX = totalEnergy ? (weightedX / totalEnergy) / (size - 1) * 100 : 50;
      const focusY = totalEnergy ? (weightedY / totalEnergy) / (size - 1) * 100 : 50;
      return {
        focusX: clamp(focusX, 0, 100),
        focusY: clamp(focusY, 0, 100),
        contrast: clamp(Math.sqrt(variance / gray.length) * 3.2, 0, 1),
        brightness: clamp(mean, 0, 1),
        detail: clamp(totalEnergy / 28, 0, 1)
      };
    }catch(e){
      return fallback;
    }
  }

  function loadHeroMeta(candidate){
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      if('fetchPriority' in img) img.fetchPriority = 'low';
      const done = () => {
        if(!img.naturalWidth || !img.naturalHeight){
          resolve(null);
          return;
        }
        const analysis = imageAnalysis(img);
        resolve({
          w: img.naturalWidth,
          h: img.naturalHeight,
          ratio: img.naturalWidth / img.naturalHeight,
          focusX: analysis.focusX,
          focusY: analysis.focusY,
          contrast: analysis.contrast,
          brightness: analysis.brightness,
          detail: analysis.detail,
          checkedAt: Date.now()
        });
      };
      img.onload = done;
      img.onerror = () => resolve(null);
      img.src = candidate.source;
      if(img.decode){
        img.decode().then(done).catch(() => {});
      }
    });
  }

  function cropFraction(ratio, frameRatio){
    if(!ratio || !frameRatio) return 1;
    return ratio >= frameRatio ? 1 - (frameRatio / ratio) : 1 - (ratio / frameRatio);
  }

  function scoreHeroMeta(meta, mode, frameRatio){
    if(!meta || !meta.w || !meta.h || !meta.ratio) return null;
    const ratio = meta.ratio;
    const crop = cropFraction(ratio, frameRatio);
    const isMobile = mode === 'mobile';
    const maxCrop = isMobile ? .46 : .42;

    if(isMobile){
      if(ratio > 1.08 || ratio < .44) return null;
      if(meta.h < 980 && meta.w < 900) return null;
    }else{
      if(ratio < 1.18) return null;
      if(meta.w < 1100) return null;
    }
    if(crop > maxCrop) return null;

    const cropScore = 1 - (crop / maxCrop);
    const resolutionScore = isMobile
      ? clamp(Math.min(meta.h / 1700, meta.w / 950), 0, 1)
      : clamp(Math.min(meta.w / 1800, meta.h / 1050), 0, 1);
    const contrastScore = clamp((meta.contrast || .35) * .9 + (meta.detail || .25) * .25, 0, 1);
    const brightnessPenalty = (meta.brightness < .18 || meta.brightness > .88) ? .10 : 0;
    const orientationSweetSpot = isMobile
      ? (ratio >= .52 && ratio <= .82 ? 1 : .74)
      : (ratio >= 1.32 && ratio <= 1.85 ? 1 : .78);

    const score =
      cropScore * 56 +
      resolutionScore * 20 +
      contrastScore * 18 +
      orientationSweetSpot * 10 -
      brightnessPenalty * 20;

    return Math.max(0, score);
  }

  function objectPositionFromMeta(meta, mode, frameRatio){
    const ratio = meta && meta.ratio ? meta.ratio : 1;
    let x = 50;
    let y = 50;
    if(ratio > frameRatio){
      x = clamp(meta.focusX || 50, mode === 'mobile' ? 26 : 30, mode === 'mobile' ? 74 : 70);
    }
    if(ratio < frameRatio){
      y = clamp(meta.focusY || 50, mode === 'mobile' ? 34 : 36, mode === 'mobile' ? 68 : 64);
    }
    return {x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10};
  }

  function weightedPick(items){
    if(!items.length) return null;
    const weights = items.map((item, index) => Math.max(1, item.score - 18) * (1 + Math.max(0, 7 - index) * .025));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let marker = Math.random() * total;
    for(let i = 0; i < items.length; i++){
      marker -= weights[i];
      if(marker <= 0) return items[i];
    }
    return items[0];
  }

  async function collectEligibleCandidates(candidates, mode, frameRatio){
    const metaCache = readHeroMetaCache();
    const eligible = [];
    const addIfEligible = (candidate, meta) => {
      const score = scoreHeroMeta(meta, mode, frameRatio);
      if(score === null) return false;
      eligible.push({candidate, meta, score});
      return true;
    };

    shuffle(candidates).forEach(candidate => {
      const meta = metaCache[candidate.source];
      if(meta) addIfEligible(candidate, meta);
    });

    const minimum = mode === 'mobile' ? 9 : 7;
    const maxInspect = mode === 'mobile' ? 24 : 34;
    let inspected = 0;
    const uncached = shuffle(candidates.filter(candidate => !metaCache[candidate.source]));

    for(const candidate of uncached){
      if(inspected >= maxInspect) break;
      inspected += 1;
      const meta = await loadHeroMeta(candidate);
      if(meta){
        metaCache[candidate.source] = meta;
        addIfEligible(candidate, meta);
      }
      if(eligible.length >= minimum && inspected >= Math.min(10, maxInspect)) break;
    }

    writeHeroMetaCache(metaCache);
    return eligible;
  }

  async function pickDynamicHero(data, collections, counts){
    const candidates = buildHeroCandidates(data, collections, counts);
    if(!candidates.length) return data.homeCover || {};

    const mode = currentMode();
    const frameRatio = heroFrameRatio();
    const eligible = await collectEligibleCandidates(candidates, mode, frameRatio);

    if(!eligible.length){
      return data.homeCover || candidates[0] || {};
    }

    eligible.sort((a, b) => b.score - a.score);
    const recent = readRecentHeroSources();
    const strongLimit = Math.max(6, Math.ceil(eligible.length * .45));
    let pool = eligible.slice(0, strongLimit).filter(item => !recent.includes(item.candidate.source));
    if(!pool.length) pool = eligible.slice(0, strongLimit);

    const picked = weightedPick(pool) || pool[0] || eligible[0];
    const objectPosition = objectPositionFromMeta(picked.meta, mode, frameRatio);
    const hero = {
      ...picked.candidate,
      composition: null,
      mobileComposition: null,
      desktopObjectPosition: mode === 'desktop' ? objectPosition : undefined,
      mobileObjectPosition: mode === 'mobile' ? objectPosition : undefined,
      objectPosition
    };

    rememberHeroSource(picked.candidate.source, eligible.length);
    return hero;
  }

  function cardTemplate(collection, cover, options){
    const label = options.label || 'Serie';
    const large = options.large ? ' feature-card--large' : '';
    const text = collection.subtitle || collection.description || 'Fotografía de calle';
    return `
      <a class="feature-card${large}" href="${collection.url}">
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
      const response = await fetch(`collections.json?t=${cacheBust}`, {cache:'no-store'});
      const data = await response.json();
      allCollections = data.collections || [];

      const countMap = await Promise.all(allCollections.map(countPhotos));
      homeData = await pickDynamicHero(data, allCollections, countMap);
      warmImage(selectedHeroSource(homeData), true);
      applyComposition(coverImg, homeData);

      const portfolio = allCollections.filter(c => c.type === 'portfolio');
      const publicCollections = portfolio.filter(c => c.id !== 'hall-of-fame');
      const latest = publicCollections[publicCollections.length - 1] || portfolio[portfolio.length - 1];

      const total = countMap.reduce((sum, item) => sum + (Number.isFinite(item.count) ? item.count : 0), 0);
      if(statPhotos) statPhotos.textContent = total ? `${total}+` : '—';
      if(statSeries) statSeries.textContent = String(publicCollections.length || portfolio.length || '—');
      if(statLatestLink && latest && latest.url) statLatestLink.setAttribute('href', latest.url);
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
      if(homeData) applyComposition(coverImg, homeData);
      if(mode !== lastViewportMode){
        lastViewportMode = mode;
        loadHome();
      }
    }, 160);
  }

  loadHome();
  window.addEventListener('resize', handleResize, {passive:true});
})();
