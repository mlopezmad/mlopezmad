(function () {
  const config = window.GALLERY_CONFIG;

  if (!config) {
    console.error("Falta GALLERY_CONFIG");
    return;
  }

  document.title = `${config.titulo} - mlopezmad`;

  document.body.innerHTML = `
    <header>
  <h1>${config.titulo}</h1>
  <p>${config.subtitulo || ""}</p>

  ${
    config.intro
      ? `<div class="intro-text">${config.intro}</div>`
      : ""
  }
</header>

<div class="filtros">
      <button class="activo" data-filtro="todas">Todas</button>
      <button data-filtro="bn">B&N</button>
      <button data-filtro="color">Color</button>
    </div>

    <div class="galeria" id="galeria"></div>

    <a class="volver" href="${config.volver || "portfolio.html"}">← Volver</a>

    <footer class="footer">
      <p>© 2026 mlopezmad</p>
      <p>Madrid · España</p>
    </footer>

    <div class="lightbox" id="lightbox">
      <span class="cerrar" id="cerrar">×</span>
      <button class="nav-btn prev" id="prev">‹</button>
      <img id="lightbox-img" src="" alt="">
      <button class="nav-btn next" id="next">›</button>
      <div class="contador" id="contador">1 / 1</div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    *{margin:0;padding:0;box-sizing:border-box;}

    body{
      background:var(--bg);
      font-family:Georgia,serif;
      color:var(--text);
      transition:background .25s ease,color .25s ease;
    }

    header{
      text-align:center;
      padding:60px 20px;
    }

    header h1{
      font-size:3rem;
      font-weight:400;
      color:var(--text);
    }

    header p{
      color:var(--muted-2);
      margin-top:10px;
    }

.intro-text{
  max-width:760px;
  margin:36px auto 0;
  padding:0 24px;
  color:var(--muted);
  font-size:1.08rem;
  line-height:1.9;
  text-align:left;
}

.intro-text p{
  margin-bottom:22px;
}

.intro-text p:last-child{
  margin-bottom:0;
}
    .filtros{
      text-align:center;
      margin:-25px 0 40px;
    }

    .filtros button{
      background:none;
      border:none;
      font-family:Georgia,serif;
      font-size:1rem;
      margin:0 12px;
      color:var(--muted-2);
      cursor:pointer;
    }

    .filtros button.activo{
      color:var(--text);
      text-decoration:underline;
    }

    .galeria{
      max-width:1400px;
      margin:0 auto 80px;
      padding:0 20px;
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
      gap:20px;
    }

    .galeria img{
      width:100%;
      display:block;
      cursor:pointer;
      -webkit-touch-callout:none;
      -webkit-user-select:none;
      user-select:none;
    }

    .volver{
      display:block;
      text-align:center;
      margin:50px 0;
      text-decoration:none;
      color:var(--text);
      font-size:1.1rem;
    }

    .footer{
      text-align:center;
      color:var(--muted-3);
      font-size:.9rem;
      line-height:1.7;
      padding:40px 20px 60px;
    }

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

    .lightbox img.fade-left{
      opacity:0;
      transform:translateX(-18px);
    }

    .lightbox img.fade-right{
      opacity:0;
      transform:translateX(18px);
    }

    .cerrar{
      position:fixed;
      top:22px;
      right:28px;
      color:#fff;
      font-size:2.2rem;
      cursor:pointer;
      font-family:Arial,sans-serif;
      z-index:1001;
      opacity:0;
      transition:opacity .4s ease;
    }

    .nav-btn{
      position:fixed;
      top:50%;
      transform:translateY(-50%);
      color:rgba(255,255,255,.75);
      background:none;
      border:none;
      font-size:4rem;
      line-height:1;
      cursor:pointer;
      z-index:1001;
      opacity:0;
      transition:opacity .4s ease, color .3s ease;
    }

    .nav-btn:hover{color:#fff;}

    .prev{left:22px;}
    .next{right:22px;}

    .contador{
      position:fixed;
      bottom:24px;
      left:50%;
      transform:translateX(-50%);
      color:rgba(255,255,255,.8);
      font-family:Arial,sans-serif;
      font-size:.9rem;
      letter-spacing:1px;
      z-index:1001;
      opacity:0;
      transition:opacity .4s ease;
    }

    .lightbox.show-controls .nav-btn,
    .lightbox.show-controls .contador,
    .lightbox.show-controls .cerrar{
      opacity:1;
    }

    @media(max-width:768px){
      header h1{font-size:2.8rem;}

      .galeria{
        grid-template-columns:1fr;
        padding:0 16px;
        gap:24px;
      }

      .nav-btn{
        font-size:3.2rem;
      }

      .prev{left:10px;}
      .next{right:10px;}
    }
  `;
  document.head.appendChild(style);

  const galeria = document.getElementById("galeria");
  const botonesFiltro = document.querySelectorAll(".filtros button");

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const cerrar = document.getElementById("cerrar");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  const contador = document.getElementById("contador");

  let imagenes = [];
  let imagenesFiltradas = [];
  let indiceActual = 0;
  let touchStartX = 0;
  let touchEndX = 0;
  let controlsTimer;

  function mostrarControles(){
    lightbox.classList.add("show-controls");
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => {
      lightbox.classList.remove("show-controls");
    }, 2000);
  }

  async function cargarGaleria(){
    const respuesta = await fetch(config.json + "?t=" + Date.now());
    const datos = await respuesta.json();
    imagenes = datos.imagenes || [];
    aplicarFiltro("todas");
  }

  function aplicarFiltro(filtro){
    botonesFiltro.forEach(btn => {
      btn.classList.toggle("activo", btn.dataset.filtro === filtro);
    });

    imagenesFiltradas = filtro === "todas"
      ? imagenes
      : imagenes.filter(img => img.tipo === filtro);

    pintarGaleria();
  }

  function pintarGaleria(){
    galeria.innerHTML = "";

    imagenesFiltradas.forEach((item, index) => {
      const img = document.createElement("img");
      img.src = config.carpeta + item.archivo;
      img.alt = `Fotografía de ${config.titulo}`;
      img.draggable = false;
      img.addEventListener("click", () => abrirLightbox(index));
      galeria.appendChild(img);
    });
  }

  function abrirLightbox(indice){
    indiceActual = indice;
    lightboxImg.src = config.carpeta + imagenesFiltradas[indiceActual].archivo;
    contador.textContent = `${indiceActual + 1} / ${imagenesFiltradas.length}`;
    lightbox.classList.add("active");
    mostrarControles();
  }

  function cerrarLightbox(){
    lightbox.classList.remove("active");
    lightbox.classList.remove("show-controls");
  }

  function cambiarImagen(nuevoIndice, direccion){
    lightboxImg.classList.add(direccion === "next" ? "fade-left" : "fade-right");

    setTimeout(() => {
      indiceActual = nuevoIndice;
      lightboxImg.src = config.carpeta + imagenesFiltradas[indiceActual].archivo;
      contador.textContent = `${indiceActual + 1} / ${imagenesFiltradas.length}`;
      lightboxImg.classList.remove("fade-left", "fade-right");
      mostrarControles();
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
    btn.addEventListener("click", () => aplicarFiltro(btn.dataset.filtro));
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