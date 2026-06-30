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
                    <img src="${imagenUrl}" alt="${coleccion.titulo}">
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
