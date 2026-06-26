import { PROTECTED_COLLECTIONS } from "./config.js";
import { loadCollectionsData, loadGalleryJson, workerRequest } from "./api.js";
import { dom } from "./dom.js";
import { state } from "./state.js";
import { escapeQuotes } from "./utils.js";

export async function refreshCollections() {
    await loadCollections();
    populateCollectionSelect();
    await loadStats();
}

export async function loadCollections() {
    const data = await loadCollectionsData();

    state.collections = (data.collections || []).map(collection => {
        const title = collection.type === "iphone4s"
            ? `iPhone 4s · ${collection.title}`
            : collection.title;

        return {
    id: collection.id,
    name: title,
    path: collection.path,
    json: "../" + collection.json,
    rawJson: collection.json,
    url: "../" + collection.url,
    type: collection.type,
    year: collection.year,
    description: collection.description,
    cover: collection.cover || "",
    protected: PROTECTED_COLLECTIONS.includes(collection.id)
};
    });
}

export function populateCollectionSelect() {
    dom.collectionSelect.innerHTML = "";

    state.collections.forEach(collection => {
        const option = document.createElement("option");
        option.value = collection.path;
        option.dataset.url = collection.url;
        option.textContent = collection.name;
        dom.collectionSelect.appendChild(option);
    });
}

export async function loadStats() {
    dom.collectionStats.innerHTML = `<div class="collection-row">Cargando colecciones...</div>`;

    const rows = [];

    for (const collection of state.collections) {
        let totalText = "No disponible";

        try {
            const data = await loadGalleryJson(collection.json);
            const total = (data.imagenes || []).length;
            totalText = `${total} ${total === 1 ? "fotografía" : "fotografías"}`;
        } catch (error) {
            totalText = "No disponible";
        }

        rows.push(`
            <div class="collection-row">
                <button
                    type="button"
                    onclick="openCollectionManager('${collection.id}')"
                    style="background:none;color:#111;border:none;text-align:left;padding:0;margin:0;width:auto;"
                >
                    <strong>${collection.name}</strong>
                    <span>${totalText} →</span>
                </button>

                ${collection.protected ? "" : `
                    <button
                        type="button"
                        onclick="deleteCollection('${collection.id}', '${escapeQuotes(collection.name)}')"
                        style="margin-top:12px;background:#fff;color:#a33;border-color:#e5caca;"
                    >
                        Eliminar
                    </button>
                `}
            </div>
        `);
    }

    dom.collectionStats.innerHTML = rows.join("");
}

export async function deleteCollection(id, name, password) {
    const firstConfirm = confirm(`¿Seguro que quieres eliminar la colección "${name}"?`);

    if (!firstConfirm) return;

    const typed = prompt(`Esta acción eliminará la colección "${name}", su carpeta de imágenes, su galeria.json y su página HTML.\n\nEscribe ELIMINAR para confirmar.`);

    if (typed !== "ELIMINAR") {
        alert("Eliminación cancelada.");
        return;
    }

    dom.collectionStats.innerHTML = `<div class="collection-row">Eliminando colección...</div>`;

    try {
        const data = await workerRequest({
            action: "delete_collection",
            password,
            id
        });

        alert(`Colección "${data.deleted}" eliminada correctamente.`);
        await refreshCollections();

    } catch (error) {
        alert("Error: " + error.message);
        await refreshCollections();
    }
}