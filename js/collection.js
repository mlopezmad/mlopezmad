document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("colecciones");

    if (!contenedor || !window.COLLECTIONS) return;

    contenedor.className = "collection-grid";

    for (const coleccion of window.COLLECTIONS) {
        try {
            const respuesta = await fetch(coleccion.json + "?t=" + Date.now());
            const datos = await respuesta.json();

            const imagenes = datos.imagenes || [];
            const total = imagenes.length;

            let imagenUrl = coleccion.cover || "";

            if (!imagenUrl && total > 0) {
                const carpeta = coleccion.json.replace("galeria.json", "");
                imagenUrl = carpeta + imagenes[0].archivo;
            }

            const tarjeta = document.createElement("a");
            tarjeta.className = "collection-card";
            tarjeta.href = coleccion.url;

            tarjeta.innerHTML = `
                ${imagenUrl ? `
                <div class="collection-cover">
                    <img src="${imagenUrl}" alt="${coleccion.titulo}" loading="lazy" decoding="async" fetchpriority="low" ${compositionStyle(coleccion.coverComposition)}>
                </div>
                ` : ""}
                <div class="collection-content">
                    <h3>${coleccion.titulo}</h3>
                    <p>${coleccion.subtitle || coleccion.subtitulo || coleccion.description || coleccion.descripcion || ""}</p>
                    <span>${total} ${total === 1 ? "fotografía" : "fotografías"}</span>
                    <strong>Ver colección →</strong>
                </div>
            `;

            contenedor.appendChild(tarjeta);

        } catch (error) {
            console.error("Error cargando colección:", coleccion.titulo, error);
        }
    }
});

function compositionStyle(composition){
    if(!composition) return "";
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const value = isMobile ? (composition.mobile || composition.desktop) : (composition.desktop || composition.mobile);
    if(!value) return "";
    const x = Number(value.x || 0);
    const y = Number(value.y || 0);
    const scale = Number(value.scale || 1);
    return `class="cover-composed" style="transform:translate(-50%, -50%) translate(${x}%, ${y}%) scale(${scale});transform-origin:center center;"`;
}
