(function () {
  const config = window.GALLERY_CONFIG;

  if (!config) {
    console.error("Falta GALLERY_CONFIG");
    return;
  }

  const STORAGE_VIEW_KEY = "mlopezmad.gallery.view";

  function resolveBackHref(){
    const fallback = config.volver || "portfolio.html";
    try{
      const params = new URLSearchParams(window.location.search);
      if(params.get('from') === 'home'){
        params.delete('from');
        const cleanQuery = params.toString();
        const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash || ''}`;
        if(window.history && window.history.replaceState) window.history.replaceState(null, document.title, cleanUrl);
        return "index.html#seleccion-reciente";
      }
    }catch(error){}
    return fallback;
  }

  const backHref = resolveBackHref();

  document.title = `${config.titulo} - mlopezmad`;
  document.body.classList.add('gallery-page');

  document.body.innerHTML = `
    <header class="site-header site-header--page">
      <a class="site-brand" href="index.html"><img class="brand-mark" src="assets/logo-mark.png" alt="" aria-hidden="true"><span>mlopezmad</span></a>
      <button class="mobile-menu-button mobile-menu-button--page" type="button" aria-expanded="false" aria-controls="mainNav">Menú</button>
      <nav class="site-nav site-nav--page" id="mainNav" aria-label="Navegación principal">
        <a href="index.html">Inicio</a>
        <a href="portfolio.html">Portfolio</a>
        <a href="sobre-mi.html">Sobre mí</a>
        <a href="newsletter.html">Newsletter</a>
        <a class="nav-pill" href="contacto.html">Contacto</a>
      </nav>
    </header>

    <section class="gallery-header">
      <p class="eyebrow eyebrow--dark">${config.eyebrow || 'Serie fotográfica'}</p>
      <h1>${config.titulo}</h1>
      ${config.subtitulo ? `<p class="gallery-subtitle">${config.subtitulo}</p>` : ""}
      ${config.intro ? `<div class="intro-text">${config.intro}</div>` : ""}
    </section>

    <div class="gallery-tools-wrap" id="galleryToolsWrap">
      <div class="gallery-tools" id="galleryTools" aria-label="Controles de galería">
        <div class="filtros" role="tablist" aria-label="Filtros de galería">
          <button class="activo" data-filtro="todas" type="button">Todas</button>
          <button data-filtro="bn" type="button">B&N</button>
          <button data-filtro="color" type="button">Color</button>
        </div>
        <div class="view-switch" role="group" aria-label="Vista de galería">
          <button class="view-button" data-view="editorial" type="button" aria-label="Vista editorial" title="Vista editorial">
            <span class="view-icon view-icon--editorial" aria-hidden="true"></span>
          </button>
          <button class="view-button" data-view="indice" type="button" aria-label="Vista índice" title="Vista índice">
            <span class="view-icon view-icon--indice" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>

    <div class="galeria" id="galeria"></div>

    <div class="gallery-back">
      <a class="volver" href="${backHref}">← Volver</a>
    </div>

    <footer class="site-footer">
      <span>© 2026 mlopezmad · Madrid, España</span>
      <nav class="footer-nav" aria-label="Navegación secundaria">
        <a href="portfolio.html">Portfolio</a>
        <a href="sobre-mi.html">Sobre mí</a>
        <a href="newsletter.html">Newsletter</a>
        <a href="contacto.html">Contacto</a>
      </nav>
    </footer>

    <div class="lightbox" id="lightbox" aria-hidden="true">
      <span class="cerrar" id="cerrar">×</span>
      <button class="nav-btn prev" id="prev" type="button" aria-label="Fotografía anterior">‹</button>
      <img id="lightbox-img" src="" alt="">
      <button class="nav-btn next" id="next" type="button" aria-label="Fotografía siguiente">›</button>
      <div class="contador" id="contador">1 / 1</div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .gallery-page{background:var(--bg);}
    .gallery-header{
      max-width:1120px;
      margin:0 auto;
      padding:32px clamp(22px,5vw,56px) 34px;
      text-align:left;
    }
    .gallery-header h1{
      font-size:clamp(4rem,11vw,9rem);
      line-height:.86;
      letter-spacing:-.092em;
      font-weight:560;
      color:var(--text);
      margin:0;
    }
    .gallery-subtitle{
      margin-top:22px;
      color:var(--muted);
      font-size:clamp(1.2rem,2vw,1.7rem);
      letter-spacing:-.05em;
      max-width:720px;
    }
    .intro-text{
      max-width:790px;
      margin:28px 0 0;
      color:var(--muted);
      font-size:1.08rem;
      line-height:1.85;
      letter-spacing:-.026em;
    }
    .intro-text p{margin-bottom:22px;}
    .intro-text p:last-child{margin-bottom:0;}
    .gallery-tools-wrap{
      max-width:1120px;
      margin:0 auto 34px;
      padding:0 clamp(22px,5vw,56px);
      position:sticky;
      top:calc(env(safe-area-inset-top) + 12px);
      z-index:45;
      pointer-events:none;
    }
    .gallery-tools{
      width:max-content;
      max-width:100%;
      display:flex;
      align-items:center;
      gap:10px;
      padding:7px;
      border:1px solid rgba(255,255,255,.54);
      border-radius:999px;
      background:
        linear-gradient(135deg,rgba(255,255,255,.44),rgba(255,255,255,.18) 48%,rgba(255,255,255,.32));
      box-shadow:
        0 18px 54px rgba(0,0,0,.13),
        inset 0 1px 0 rgba(255,255,255,.76),
        inset 0 -1px 0 rgba(255,255,255,.20);
      backdrop-filter:blur(38px) saturate(225%) contrast(1.08);
      -webkit-backdrop-filter:blur(38px) saturate(225%) contrast(1.08);
      pointer-events:auto;
      overflow-x:auto;
      scrollbar-width:none;
      position:relative;
      isolation:isolate;
    }
    .gallery-tools::before{
      content:"";
      position:absolute;
      left:8px;
      right:8px;
      top:5px;
      height:46%;
      border-radius:999px;
      background:linear-gradient(to bottom,rgba(255,255,255,.52),rgba(255,255,255,0));
      pointer-events:none;
      z-index:0;
    }
    .gallery-tools > *{position:relative;z-index:1;}
    .gallery-tools::-webkit-scrollbar{display:none;}
    html[data-theme="dark"] .gallery-tools{
      border-color:rgba(255,255,255,.20);
      background:
        linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.055) 48%,rgba(255,255,255,.11));
      box-shadow:
        0 18px 58px rgba(0,0,0,.42),
        inset 0 1px 0 rgba(255,255,255,.22),
        inset 0 -1px 0 rgba(255,255,255,.08);
    }
    html[data-theme="dark"] .gallery-tools::before{
      background:linear-gradient(to bottom,rgba(255,255,255,.20),rgba(255,255,255,0));
    }
    .filtros{
      display:flex;
      align-items:center;
      gap:8px;
      flex:0 0 auto;
      margin:0;
      padding:0;
    }
    .filtros button,
    .view-button{
      border:1px solid rgba(255,255,255,.42);
      background:rgba(255,255,255,.52);
      color:var(--muted);
      border-radius:999px;
      min-height:42px;
      padding:0 18px;
      cursor:pointer;
      font-size:.96rem;
      font-weight:650;
      letter-spacing:-.025em;
      backdrop-filter:blur(18px) saturate(180%);
      -webkit-backdrop-filter:blur(18px) saturate(180%);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.62),0 6px 18px rgba(0,0,0,.055);
      transition:background .2s ease,color .2s ease,transform .2s ease,border-color .2s ease,box-shadow .2s ease;
      white-space:nowrap;
    }
    html[data-theme="dark"] .filtros button,
    html[data-theme="dark"] .view-button{
      border-color:rgba(255,255,255,.16);
      background:rgba(255,255,255,.09);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 8px 20px rgba(0,0,0,.16);
    }
    .filtros button:hover,
    .view-button:hover{transform:translateY(-1px);color:var(--text);}
    .filtros button.activo,
    .view-button.activo{background:var(--text);color:var(--bg);border-color:var(--text);}
    .view-switch{
      display:flex;
      align-items:center;
      gap:6px;
      padding-left:2px;
      flex:0 0 auto;
    }
    .view-button{
      width:42px;
      padding:0;
      display:grid;
      place-items:center;
    }
    .view-icon{display:block;position:relative;width:18px;height:18px;}
    .view-icon--editorial::before{
      content:"";
      position:absolute;
      inset:2px 4px;
      border:2px solid currentColor;
      border-radius:3px;
    }
    .view-icon--indice{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:3px;
    }
    .view-icon--indice::before,
    .view-icon--indice::after{
      content:"";
      display:block;
      border-radius:2px;
      background:currentColor;
      box-shadow:9px 0 0 currentColor,0 9px 0 currentColor,9px 9px 0 currentColor;
      width:6px;
      height:6px;
    }
    .view-icon--indice::after{display:none;}
    .galeria{
      max-width:1480px;
      margin:34px auto 70px;
      padding:0 clamp(16px,3vw,34px);
      columns:3 320px;
      column-gap:18px;
    }
    .galeria img{
      width:100%;
      display:block;
      break-inside:avoid;
      margin:0 0 18px;
      cursor:pointer;
      border-radius:18px;
      background:var(--surface-soft);
      box-shadow:0 12px 34px rgba(0,0,0,.08);
      min-height:120px;
      -webkit-touch-callout:none;
      -webkit-user-select:none;
      user-select:none;
      transition:transform .24s ease, box-shadow .24s ease, opacity .24s ease;
    }
    .galeria img:hover{transform:translateY(-3px);box-shadow:var(--shadow-soft);}
    .galeria--indice{
      columns:auto;
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:10px;
      max-width:1320px;
    }
    .galeria--indice img{
      aspect-ratio:1/1;
      object-fit:cover;
      margin:0;
      min-height:0;
      border-radius:14px;
      box-shadow:0 10px 26px rgba(0,0,0,.08);
    }
    .galeria--indice img:hover{transform:translateY(-2px);}
    .galeria--empty{
      display:block !important;
      columns:auto !important;
      min-height:220px;
    }
    .galeria--empty .portfolio-empty{
      display:block;
      width:100%;
      max-width:100%;
      margin:78px auto 42px;
      text-align:center;
      color:var(--muted-2);
    }
    .galeria--indice .portfolio-empty{
      grid-column:1 / -1;
      justify-self:center;
    }
    .gallery-back{text-align:center;margin:18px 0 26px;}
    .lightbox{
      display:none;
      position:fixed;
      inset:0;
      z-index:999;
      background:rgba(0,0,0,.97);
      align-items:center;
      justify-content:center;
      padding:20px;
    }
    .lightbox.active{display:flex;}
    .lightbox img{
      max-width:100%;
      max-height:88vh;
      object-fit:contain;
      opacity:1;
      transform:translateX(0);
      transition:opacity .25s ease, transform .25s ease;
      -webkit-touch-callout:none;
      -webkit-user-select:none;
      user-select:none;
    }
    .lightbox img.fade-left{opacity:0;transform:translateX(-18px);}
    .lightbox img.fade-right{opacity:0;transform:translateX(18px);}
    .cerrar{
      position:fixed;
      top:calc(18px + env(safe-area-inset-top));
      right:22px;
      width:48px;
      height:48px;
      display:grid;
      place-items:center;
      border-radius:999px;
      color:#fff;
      font-size:2rem;
      cursor:pointer;
      z-index:1001;
      opacity:0;
      background:rgba(255,255,255,.13);
      backdrop-filter:blur(16px);
      -webkit-backdrop-filter:blur(16px);
      transition:opacity .4s ease,background .2s ease;
    }
    .cerrar:hover{background:rgba(255,255,255,.22);}
    .nav-btn{
      position:fixed;
      top:50%;
      transform:translateY(-50%);
      width:54px;
      height:54px;
      display:grid;
      place-items:center;
      color:rgba(255,255,255,.86);
      background:rgba(255,255,255,.12);
      border:1px solid rgba(255,255,255,.12);
      border-radius:999px;
      font-size:3.2rem;
      line-height:1;
      cursor:pointer;
      z-index:1001;
      opacity:0;
      transition:opacity .4s ease, background .2s ease, color .2s ease;
      backdrop-filter:blur(16px);
      -webkit-backdrop-filter:blur(16px);
    }
    .nav-btn:hover{color:#fff;background:rgba(255,255,255,.20);}
    .prev{left:22px;}
    .next{right:22px;}
    .contador{
      position:fixed;
      bottom:calc(22px + env(safe-area-inset-bottom));
      left:50%;
      transform:translateX(-50%);
      color:rgba(255,255,255,.78);
      font-size:.9rem;
      font-weight:650;
      letter-spacing:.04em;
      z-index:1001;
      opacity:0;
      transition:opacity .4s ease;
    }
    .lightbox.show-controls .nav-btn,
    .lightbox.show-controls .contador,
    .lightbox.show-controls .cerrar{opacity:1;}
    @media(max-width:1100px){
      .galeria--indice{grid-template-columns:repeat(4,minmax(0,1fr));}
    }
    @media(max-width:768px){
      .gallery-header{padding:14px 22px 24px;}
      .gallery-header h1{font-size:clamp(3.6rem,18vw,5.6rem);}
      .gallery-subtitle{font-size:1.2rem;}
      .intro-text{font-size:1rem;line-height:1.72;margin-top:24px;}
      .gallery-tools-wrap{padding:0 14px;margin-bottom:22px;top:calc(env(safe-area-inset-top) + 8px);}
      .gallery-tools{width:100%;justify-content:space-between;gap:6px;padding:6px;border-radius:999px;}
      .filtros{gap:6px;}
      .filtros button{min-height:38px;padding:0 13px;font-size:.9rem;}
      .view-switch{gap:5px;}
      .view-button{width:38px;min-height:38px;}
      .galeria{columns:1;padding:0 14px;column-gap:0;margin-top:20px;}
      .galeria img{border-radius:16px;margin-bottom:16px;}
      .galeria--indice{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:0 8px;margin-top:18px;}
      .galeria--indice img{border-radius:8px;margin:0;}
      .nav-btn{width:46px;height:46px;font-size:2.7rem;}
      .prev{left:10px;}
      .next{right:10px;}
    }
    @media(max-width:374px){
      .filtros button{padding:0 11px;font-size:.86rem;}
      .view-button{width:36px;min-height:36px;}
      .gallery-tools{gap:4px;padding:5px;}
      .filtros{gap:4px;}
      .view-switch{gap:4px;}
    }
  `;
  document.head.appendChild(style);

  const galeria = document.getElementById("galeria");
  const botonesFiltro = document.querySelectorAll(".filtros button");
  const botonesVista = document.querySelectorAll(".view-button");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const cerrar = document.getElementById("cerrar");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  const contador = document.getElementById("contador");

  let imagenes = [];
  let imagenesFiltradas = [];
  let indiceActual = 0;
  let filtroActual = "todas";
  let vistaActual = normalizarVista(leerVistaGuardada()) || "editorial";
  let touchStartX = 0;
  let touchEndX = 0;
  let controlsTimer;
  let ultimoIndiceNavegado = 0;

  function indiceSeguro(indice){
    if(!imagenesFiltradas.length) return 0;
    return Math.max(0, Math.min(Number(indice) || 0, imagenesFiltradas.length - 1));
  }

  function archivoEnIndice(indice){
    const item = imagenesFiltradas[indiceSeguro(indice)];
    return item && item.archivo ? item.archivo : null;
  }

  function indicePorArchivo(archivo, fallback = 0){
    if(!archivo) return indiceSeguro(fallback);
    const index = imagenesFiltradas.findIndex(item => item && item.archivo === archivo);
    return index >= 0 ? index : indiceSeguro(fallback);
  }

  function normalizarVista(vista){
    return vista === "indice" || vista === "editorial" ? vista : null;
  }

  function leerVistaGuardada(){
    try{
      return window.localStorage.getItem(STORAGE_VIEW_KEY);
    }catch(error){
      return null;
    }
  }

  function guardarVista(vista){
    try{
      window.localStorage.setItem(STORAGE_VIEW_KEY, vista);
    }catch(error){
      // En navegación privada algunos navegadores pueden bloquear localStorage.
    }
  }

  function mostrarControles(){
    lightbox.classList.add("show-controls");
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => {
      lightbox.classList.remove("show-controls");
    }, 2000);
  }

  async function cargarGaleria(){
    try{
      const respuesta = await fetch(config.json + "?t=" + Date.now(), {cache:'no-store'});
      const datos = await respuesta.json();
      imagenes = datos.imagenes || [];
      aplicarFiltro("todas", {scrollTop:false});
    }catch(error){
      galeria.innerHTML = '<p class="portfolio-empty">No se pudo cargar la galería.</p>';
    }
  }

  function actualizarEstadoVistas(){
    botonesVista.forEach(btn => {
      const activo = btn.dataset.view === vistaActual;
      btn.classList.toggle("activo", activo);
      btn.setAttribute("aria-pressed", activo ? "true" : "false");
    });
  }

  function aplicarFiltro(filtro, opciones = {}){
    filtroActual = filtro;
    botonesFiltro.forEach(btn => {
      const activo = btn.dataset.filtro === filtro;
      btn.classList.toggle("activo", activo);
      btn.setAttribute("aria-selected", activo ? "true" : "false");
    });

    imagenesFiltradas = filtro === "todas"
      ? imagenes
      : imagenes.filter(img => img.tipo === filtro);

    pintarGaleria();

    if(opciones.scrollTop){
      scrollInicioGaleria();
    }
  }

  function indiceVisible(){
    const nodos = Array.from(galeria.querySelectorAll("img[data-gallery-index]"));
    if(!nodos.length) return indiceSeguro(ultimoIndiceNavegado);

    const tools = document.getElementById("galleryToolsWrap");
    const toolsRect = tools ? tools.getBoundingClientRect() : null;
    const limiteSuperior = Math.max(0, toolsRect ? toolsRect.bottom + 18 : 0);
    const referencia = limiteSuperior + (window.innerHeight - limiteSuperior) * 0.34;
    let mejorNodo = null;
    let mejorDistancia = Infinity;

    nodos.forEach(img => {
      const rect = img.getBoundingClientRect();
      if(rect.bottom < limiteSuperior || rect.top > window.innerHeight) return;
      const centro = rect.top + rect.height / 2;
      const distancia = Math.abs(centro - referencia);
      if(distancia < mejorDistancia){
        mejorDistancia = distancia;
        mejorNodo = img;
      }
    });

    if(!mejorNodo){
      mejorNodo = nodos.find(img => img.getBoundingClientRect().bottom >= limiteSuperior) || nodos[0];
    }

    ultimoIndiceNavegado = indiceSeguro(mejorNodo.dataset.galleryIndex);
    return ultimoIndiceNavegado;
  }

  function cambiarVista(vista){
    const nuevaVista = normalizarVista(vista);
    if(!nuevaVista || nuevaVista === vistaActual) return;

    const ancla = indiceVisible();
    const archivoAncla = archivoEnIndice(ancla);
    const alturaActual = galeria.offsetHeight;
    if(alturaActual > 0){
      galeria.style.minHeight = `${alturaActual}px`;
    }

    vistaActual = nuevaVista;
    guardarVista(vistaActual);
    pintarGaleria({
      anchorIndex:ancla,
      anchorFile:archivoAncla,
      anchorBlock:"center",
      preserveHeight:true
    });
  }

  function pintarGaleria(opciones = {}){
    galeria.innerHTML = "";
    actualizarEstadoVistas();
    galeria.classList.toggle("galeria--indice", vistaActual === "indice");
    galeria.classList.toggle("galeria--editorial", vistaActual === "editorial");
    galeria.classList.toggle("galeria--empty", !imagenesFiltradas.length);

    if(!imagenesFiltradas.length){
      galeria.innerHTML = '<p class="portfolio-empty">No hay fotografías en este filtro.</p>';
      return;
    }

    imagenesFiltradas.forEach((item, index) => {
      const img = document.createElement("img");
      img.src = config.carpeta + item.archivo;
      img.alt = `Fotografía de ${config.titulo}`;
      img.dataset.galleryIndex = String(index);
      const priority = vistaActual === "indice" ? index < 24 : index < 6;

      // Vista editorial mantiene carga estable para evitar parpadeos en Safari de escritorio.
      // Vista índice usa miniaturas cuadradas y puede diferir las fotos lejanas sin saltos visuales.
      img.loading = vistaActual === "indice" && index >= 24 ? "lazy" : "eager";
      img.decoding = 'async';
      if('fetchPriority' in img) img.fetchPriority = priority ? 'high' : 'low';
      img.sizes = vistaActual === "indice"
        ? '(max-width: 768px) 33vw, (max-width: 1100px) 25vw, 20vw'
        : '(max-width: 768px) calc(100vw - 28px), (max-width: 1100px) 50vw, 33vw';
      img.draggable = false;
      img.addEventListener("click", () => abrirLightbox(index));
      galeria.appendChild(img);
    });

    if(Number.isInteger(opciones.anchorIndex) || opciones.anchorFile){
      const indiceDestino = indicePorArchivo(opciones.anchorFile, opciones.anchorIndex || 0);
      ultimoIndiceNavegado = indiceDestino;
      scrollAFoto(indiceDestino, opciones.anchorBlock || "nearest", "auto", Boolean(opciones.preserveHeight));
    }else if(imagenesFiltradas.length){
      ultimoIndiceNavegado = indiceSeguro(ultimoIndiceNavegado);
    }
  }

  function scrollInicioGaleria(){
    requestAnimationFrame(() => {
      const tools = document.getElementById("galleryToolsWrap");
      const offset = (tools ? tools.offsetHeight : 0) + 18;
      const top = galeria.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({top:Math.max(0, top), behavior:"smooth"});
    });
  }

  function scrollAFoto(indice, block = "nearest", behavior = "auto", preserveHeight = false){
    const indiceDestino = indiceSeguro(indice);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const objetivo = galeria.querySelector(`img[data-gallery-index="${indiceDestino}"]`);
        if(objetivo){
          objetivo.scrollIntoView({block, inline:"nearest", behavior});
          ultimoIndiceNavegado = indiceDestino;
        }
        if(preserveHeight){
          window.setTimeout(() => {
            galeria.style.minHeight = "";
          }, 160);
        }
      });
    });
  }

  function abrirLightbox(indice){
    indiceActual = indiceSeguro(indice);
    ultimoIndiceNavegado = indiceActual;
    lightboxImg.src = config.carpeta + imagenesFiltradas[indiceActual].archivo;
    contador.textContent = `${indiceActual + 1} / ${imagenesFiltradas.length}`;
    lightbox.classList.add("active");
    lightbox.setAttribute('aria-hidden','false');
    mostrarControles();
    precargarVecinas();
  }

  function cerrarLightbox(){
    lightbox.classList.remove("active");
    lightbox.classList.remove("show-controls");
    lightbox.setAttribute('aria-hidden','true');
    scrollAFoto(indiceActual, vistaActual === "indice" ? "center" : "nearest", "auto");
  }

  function precargarVecinas(){
    if(!imagenesFiltradas.length) return;
    [indiceActual - 1, indiceActual + 1].forEach(i => {
      const index = (i + imagenesFiltradas.length) % imagenesFiltradas.length;
      const item = imagenesFiltradas[index];
      if(!item || !item.archivo) return;
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = config.carpeta + item.archivo;
    });
  }

  function cambiarImagen(nuevoIndice, direccion){
    if(!imagenesFiltradas.length) return;
    lightboxImg.classList.add(direccion === "next" ? "fade-left" : "fade-right");

    setTimeout(() => {
      indiceActual = indiceSeguro(nuevoIndice);
      ultimoIndiceNavegado = indiceActual;
      lightboxImg.src = config.carpeta + imagenesFiltradas[indiceActual].archivo;
      contador.textContent = `${indiceActual + 1} / ${imagenesFiltradas.length}`;
      lightboxImg.classList.remove("fade-left", "fade-right");
      mostrarControles();
      precargarVecinas();
    }, 200);
  }

  function imagenAnterior(){
    const nuevoIndice = (indiceActual - 1 + imagenesFiltradas.length) % imagenesFiltradas.length;
    cambiarImagen(nuevoIndice, "prev");
  }

  function imagenSiguiente(){
    const nuevoIndice = (indiceActual + 1) % imagenesFiltradas.length;
    cambiarImagen(nuevoIndice, "next");
  }

  botonesFiltro.forEach(btn => {
    btn.addEventListener("click", () => aplicarFiltro(btn.dataset.filtro, {scrollTop:true}));
  });

  botonesVista.forEach(btn => {
    btn.addEventListener("click", () => cambiarVista(btn.dataset.view));
  });

  cerrar.addEventListener("click", cerrarLightbox);
  prev.addEventListener("click", imagenAnterior);
  next.addEventListener("click", imagenSiguiente);

  lightbox.addEventListener("click", e => {
    mostrarControles();
    if(e.target === lightbox) cerrarLightbox();
  });

  lightbox.addEventListener("mousemove", mostrarControles);

  lightbox.addEventListener("touchstart", e => {
    mostrarControles();
    touchStartX = e.changedTouches[0].screenX;
  });

  lightbox.addEventListener("touchend", e => {
    touchEndX = e.changedTouches[0].screenX;
    const diferencia = touchEndX - touchStartX;
    if(diferencia > 50) imagenAnterior();
    if(diferencia < -50) imagenSiguiente();
  });

  document.addEventListener("keydown", e => {
    if(!lightbox.classList.contains("active")) return;
    mostrarControles();
    if(e.key === "ArrowLeft") imagenAnterior();
    if(e.key === "ArrowRight") imagenSiguiente();
    if(e.key === "Escape") cerrarLightbox();
  });

  document.addEventListener("contextmenu", e => {
    e.preventDefault();
  });

  cargarGaleria();
})();
