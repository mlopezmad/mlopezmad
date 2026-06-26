import { dom } from "./modules/dom.js";
import { state } from "./modules/state.js";
import { show, fileToBase64 } from "./modules/utils.js";
import { workerRequest, loadGalleryJson } from "./modules/api.js";
import { refreshCollections, deleteCollection } from "./modules/collections.js";

let selectedPhotos = new Set();
let uploadTypes = new Map();

dom.loginBtn.addEventListener("click", async () => {
    state.password = dom.passwordInput.value.trim();

    if (!state.password) {
        dom.loginStatus.textContent = "Introduce la contraseña.";
        return;
    }

    show("dashboard");
    await refreshCollections();
});

dom.newPostBtn.addEventListener("click", () => {
    show("panel");
});

dom.newCollectionBtn.addEventListener("click", () => {
    show("collectionPanel");
});

dom.backBtn.addEventListener("click", () => {
    resetUpload();
    show("dashboard");
});

dom.backFromCollectionBtn.addEventListener("click", () => {
    resetCollectionForm();
    show("dashboard");
});

dom.filesInput.addEventListener("change", () => {
    state.selectedFiles = Array.from(dom.filesInput.files || []);
    uploadTypes.clear();
    dom.preview.innerHTML = "";

    if (state.selectedFiles.length === 0) {
        dom.fileStatus.textContent = "No hay fotografías seleccionadas.";
        dom.publishBtn.disabled = true;
        return;
    }

    state.selectedFiles.forEach((file, index) => {
        const key = getUploadKey(file, index);
        uploadTypes.set(key, "bn");

        const card = document.createElement("div");
        card.className = "photo-card";
        card.style.padding = "8px";

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        img.style.width = "100%";
        img.style.aspectRatio = "1 / 1";
        img.style.objectFit = "cover";
        img.style.marginBottom = "8px";

        const name = document.createElement("p");
        name.textContent = cleanDisplayName(file.name);
        name.style.wordBreak = "break-word";
        name.style.fontSize = ".8rem";
        name.style.lineHeight = "1.25";
        name.style.margin = "0 0 6px";
        name.style.color = "#777";

        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.flexDirection = "column";
        controls.style.gap = "3px";
        controls.style.marginTop = "4px";
        controls.style.fontSize = ".78rem";
        controls.style.color = "#111";

        controls.innerHTML = `
            <label style="display:flex;align-items:center;gap:5px;margin:0;padding:0;border:none;line-height:1.2;">
                <input
                    type="radio"
                    name="upload-type-${index}"
                    value="bn"
                    checked
                    onchange="setUploadType('${key}', 'bn')"
                    style="width:auto;margin:0;"
                >
                <span>B&N</span>
            </label>

            <label style="display:flex;align-items:center;gap:5px;margin:0;padding:0;border:none;line-height:1.2;">
                <input
                    type="radio"
                    name="upload-type-${index}"
                    value="color"
                    onchange="setUploadType('${key}', 'color')"
                    style="width:auto;margin:0;"
                >
                <span>Color</span>
            </label>
        `;

        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(controls);
        dom.preview.appendChild(card);
    });

    const totalMB = state.selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024;

    dom.fileStatus.textContent =
        `${state.selectedFiles.length} fotografía${state.selectedFiles.length === 1 ? "" : "s"} seleccionada${state.selectedFiles.length === 1 ? "" : "s"} · ${totalMB.toFixed(1)} MB · Revisa Color/B&N antes de publicar`;

    dom.publishBtn.disabled = false;
});

window.setUploadType = (key, type) => {
    uploadTypes.set(key, type);
};

dom.publishBtn.addEventListener("click", async () => {
    if (!state.password || state.selectedFiles.length === 0) return;

    dom.publishBtn.disabled = true;
    dom.publishStatus.textContent = "Preparando fotografías...";

    try {
        const files = [];

        for (let index = 0; index < state.selectedFiles.length; index++) {
            const file = state.selectedFiles[index];
            const key = getUploadKey(file, index);
            const content = await fileToBase64(file);

            files.push({
                name: file.name,
                content,
                tipo: uploadTypes.get(key) || "bn"
            });
        }

        const selectedOption = dom.collectionSelect.options[dom.collectionSelect.selectedIndex];
        state.lastGalleryUrl = selectedOption.dataset.url || "../portfolio.html";

        dom.publishStatus.textContent = "Subiendo fotografías...";

        const data = await workerRequest({
            action: "upload",
            password: state.password,
            collectionPath: dom.collectionSelect.value,
            files
        });

        show("success");

        dom.successText.textContent =
            `${data.uploaded} fotografía${data.uploaded === 1 ? "" : "s"} publicada${data.uploaded === 1 ? "" : "s"} correctamente.`;

        resetUpload();
        await refreshCollections();

    } catch (error) {
        dom.publishStatus.textContent = "Error: " + error.message;
        dom.publishBtn.disabled = false;
    }
});

dom.createCollectionBtn.addEventListener("click", async () => {
    const title = dom.collectionTitle.value.trim();
    const type = dom.collectionType.value;
    const description = dom.collectionDescription.value.trim();
    const year = dom.collectionYear.value.trim() || new Date().getFullYear();

    if (!title) {
        dom.createCollectionStatus.textContent = "Introduce el nombre de la colección.";
        return;
    }

    dom.createCollectionBtn.disabled = true;
    dom.createCollectionStatus.textContent = "Creando colección...";

    try {
        const data = await workerRequest({
            action: "create_collection",
            password: state.password,
            title,
            type,
            description,
            year
        });

        state.lastGalleryUrl = "../" + data.url;
        state.lastCreatedCollectionPath = data.path;

        show("collectionSuccess");

        dom.collectionSuccessText.textContent =
            `La colección "${data.title}" se ha creado correctamente.`;

        resetCollectionForm();
        await refreshCollections();

    } catch (error) {
        dom.createCollectionStatus.textContent = "Error: " + error.message;
        dom.createCollectionBtn.disabled = false;
    }
});

dom.viewGalleryBtn.addEventListener("click", () => {
    if (state.lastGalleryUrl) {
        window.open(state.lastGalleryUrl, "_blank");
    }
});

dom.newUploadBtn.addEventListener("click", () => {
    show("panel");
});

dom.uploadToNewCollectionBtn.addEventListener("click", async () => {
    show("panel");

    await refreshCollections();

    if (state.lastCreatedCollectionPath) {
        dom.collectionSelect.value = state.lastCreatedCollectionPath;
    }
});

dom.backToDashboardBtn.addEventListener("click", () => {
    show("dashboard");
});

dom.managerBack.addEventListener("click", () => {
    state.currentCollection = null;
    selectedPhotos.clear();
    show("dashboard");
});

dom.managerOpenGallery.addEventListener("click", () => {
    if (state.currentCollection?.url) {
        window.open(state.currentCollection.url, "_blank");
    }
});

dom.managerAddPhotos.addEventListener("click", async () => {
    if (!state.currentCollection) return;

    show("panel");

    await refreshCollections();

    dom.collectionSelect.value = state.currentCollection.path;
});

window.deleteCollection = async (id, name) => {
    await deleteCollection(id, name, state.password);
};

window.openCollectionManager = async (id) => {
    await openCollectionManager(id);
};

window.previewPhoto = (url) => {
    window.open(url, "_blank");
};

window.togglePhotoSelection = (encodedFilename) => {
    const filename = decodeURIComponent(encodedFilename);

    if (selectedPhotos.has(filename)) {
        selectedPhotos.delete(filename);
    } else {
        selectedPhotos.add(filename);
    }

    updateSelectionUI();
};

window.selectAllPhotos = () => {
    const checkboxes = document.querySelectorAll(".photo-select");
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedPhotos.add(checkbox.dataset.filename);
    });

    updateSelectionUI();
};

window.clearPhotoSelection = () => {
    selectedPhotos.clear();

    const checkboxes = document.querySelectorAll(".photo-select");
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    updateSelectionUI();
};

window.setSelectedPhotosType = async (newType) => {
    if (!state.currentCollection) return;

    const filenames = Array.from(selectedPhotos);

    if (filenames.length === 0) {
        alert("Selecciona al menos una fotografía.");
        return;
    }

    const label = newType === "color" ? "Color" : "B&N";
    const ok = confirm(`¿Cambiar ${filenames.length} fotografía${filenames.length === 1 ? "" : "s"} a ${label}?`);

    if (!ok) return;

    dom.managerMeta.textContent = "Actualizando selección...";

    try {
        const data = await workerRequest({
            action: "update_photos_type",
            password: state.password,
            collectionId: state.currentCollection.id,
            filenames,
            type: newType
        });

        alert(`${data.updated} fotografía${data.updated === 1 ? "" : "s"} actualizada${data.updated === 1 ? "" : "s"} correctamente.`);

        selectedPhotos.clear();
        await openCollectionManager(state.currentCollection.id);
        await refreshCollections();

    } catch (error) {
        alert("Error: " + error.message);
        await openCollectionManager(state.currentCollection.id);
    }
};

window.togglePhotoType = async (filename, currentType) => {
    if (!state.currentCollection) return;

    const newType = currentType === "color" ? "bn" : "color";
    const label = newType === "color" ? "Color" : "B&N";

    const ok = confirm(`¿Cambiar "${filename}" a ${label}?`);

    if (!ok) return;

    dom.managerMeta.textContent = "Actualizando fotografía...";

    try {
        await workerRequest({
            action: "update_photo_type",
            password: state.password,
            collectionId: state.currentCollection.id,
            filename,
            type: newType
        });

        await openCollectionManager(state.currentCollection.id);
        await refreshCollections();

    } catch (error) {
        alert("Error: " + error.message);
        await openCollectionManager(state.currentCollection.id);
    }
};

window.setCollectionCover = async (filename) => {
    if (!state.currentCollection) return;

    const ok = confirm(`¿Usar esta fotografía como portada de "${state.currentCollection.name}"?\n\n${filename}`);

    if (!ok) return;

    dom.managerMeta.textContent = "Actualizando portada...";

    try {
        const data = await workerRequest({
            action: "set_collection_cover",
            password: state.password,
            collectionId: state.currentCollection.id,
            filename
        });

        alert(`Portada actualizada: ${data.cover}`);

        await refreshCollections();
        await openCollectionManager(state.currentCollection.id);

    } catch (error) {
        alert("Error: " + error.message);
        await openCollectionManager(state.currentCollection.id);
    }
};

window.deletePhoto = async (filename) => {
    if (!state.currentCollection) return;

    const firstConfirm = confirm(`¿Seguro que quieres eliminar esta fotografía?\n\n${filename}`);

    if (!firstConfirm) return;

    const typed = prompt(`Esta acción eliminará la imagen de GitHub y de la galería.\n\nEscribe ELIMINAR para confirmar.`);

    if (typed !== "ELIMINAR") {
        alert("Eliminación cancelada.");
        return;
    }

    dom.managerMeta.textContent = "Eliminando fotografía...";

    try {
        const data = await workerRequest({
            action: "delete_photo",
            password: state.password,
            collectionId: state.currentCollection.id,
            filename
        });

        alert(`Fotografía "${data.deleted}" eliminada correctamente.`);

        selectedPhotos.delete(filename);
        await openCollectionManager(state.currentCollection.id);
        await refreshCollections();

    } catch (error) {
        alert("Error: " + error.message);
        await openCollectionManager(state.currentCollection.id);
    }
};

async function openCollectionManager(id) {
    const collection = state.collections.find(item => item.id === id);

    if (!collection) return;

    state.currentCollection = collection;
    selectedPhotos.clear();

    show("collectionManager");

    dom.managerTitle.textContent = collection.name;
    dom.managerMeta.textContent = "Cargando fotografías...";
    dom.managerPhotos.innerHTML = "";

    try {
        const data = await loadGalleryJson(collection.json);
        const imagenes = data.imagenes || [];

        dom.managerMeta.textContent =
            `${imagenes.length} ${imagenes.length === 1 ? "fotografía" : "fotografías"}`;

        if (imagenes.length === 0) {
            dom.managerPhotos.innerHTML = `<p class="status">Esta colección todavía no tiene fotografías.</p>`;
            return;
        }

        const basePath = "../" + collection.path + "/";
        const cover = normalizeCoverFilename(collection.cover);

        dom.managerPhotos.innerHTML = `
            <div class="bulk-actions" style="grid-column:1/-1;border:1px solid #eee;background:#fafafa;padding:18px;margin-bottom:6px;">
                <p id="selectionCount" class="status" style="margin-top:0;">0 fotografías seleccionadas</p>

                <button type="button" class="secondary" onclick="selectAllPhotos()" style="margin-top:12px;">
                    Seleccionar todo
                </button>

                <button type="button" class="secondary" onclick="clearPhotoSelection()" style="margin-top:10px;">
                    Quitar selección
                </button>

                <button type="button" onclick="setSelectedPhotosType('color')" style="margin-top:10px;">
                    Cambiar selección a Color
                </button>

                <button type="button" onclick="setSelectedPhotosType('bn')" style="margin-top:10px;">
                    Cambiar selección a B&N
                </button>
            </div>

            ${imagenes.map((imagen) => {
                const archivo = imagen.archivo || imagen.file || "";
                const tipo = imagen.tipo || imagen.type || "bn";
                const tipoTexto = tipo === "color" ? "Color" : "Blanco y negro";
                const botonTipo = tipo === "color" ? "Cambiar a B&N" : "Cambiar a Color";
                const encoded = encodeURIComponent(archivo);
                const isCover = cover === archivo;

                return `
                    <div class="photo-card" data-filename="${archivo}" style="${isCover ? "outline:2px solid #111;" : ""}">
                        <label style="display:flex;align-items:center;gap:8px;margin:0 0 10px;color:#111;">
                            <input
                                type="checkbox"
                                class="photo-select"
                                data-filename="${archivo}"
                                onchange="togglePhotoSelection('${encoded}')"
                                style="width:auto;"
                            >
                            Seleccionar
                        </label>

                        ${isCover ? `<p style="margin:0 0 8px;color:#111;font-size:.85rem;">⭐ Portada actual</p>` : ""}

                        <img src="${basePath + archivo}?t=${Date.now()}" alt="${archivo}">
                        <p>${archivo}</p>
                        <p>${tipoTexto}</p>

                        <div class="photo-actions">
                            <button type="button" class="secondary" onclick="previewPhoto('${basePath + archivo}')">
                                Ver
                            </button>

                            <button
                                type="button"
                                class="secondary"
                                onclick="togglePhotoType('${archivo}', '${tipo}')"
                            >
                                ${botonTipo}
                            </button>

                            <button
                                type="button"
                                class="secondary"
                                onclick="setCollectionCover('${archivo}')"
                            >
                                ${isCover ? "⭐ Portada actual" : "⭐ Usar como portada"}
                            </button>

                            <button
                                type="button"
                                onclick="deletePhoto('${archivo}')"
                                style="background:#fff;color:#a33;border-color:#e5caca;"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                `;
            }).join("")}
        `;

        updateSelectionUI();

    } catch (error) {
        dom.managerMeta.textContent = "No se pudo cargar la colección.";
        dom.managerPhotos.innerHTML = `<p class="status">${error.message}</p>`;
    }
}

function updateSelectionUI() {
    const count = selectedPhotos.size;
    const selectionCount = document.getElementById("selectionCount");

    if (selectionCount) {
        selectionCount.textContent =
            `${count} fotografía${count === 1 ? "" : "s"} seleccionada${count === 1 ? "" : "s"}`;
    }

    document.querySelectorAll(".photo-card").forEach(card => {
        const filename = card.dataset.filename;
        const checkbox = card.querySelector(".photo-select");

        if (!filename || !checkbox) return;

        const selected = selectedPhotos.has(filename);
        checkbox.checked = selected;
        card.style.outline = selected ? "2px solid #111" : card.style.outline;
    });
}

function getUploadKey(file, index) {
    return `${index}-${file.name}-${file.size}`;
}

function cleanDisplayName(filename) {
    return filename.replace(/\.(jpg|jpeg|png)$/i, "");
}

function normalizeCoverFilename(cover) {
    if (!cover) return "";

    const parts = String(cover).split("/");
    return parts[parts.length - 1];
}

function resetUpload() {
    dom.filesInput.value = "";
    state.selectedFiles = [];
    uploadTypes.clear();
    dom.preview.innerHTML = "";
    dom.fileStatus.textContent = "No hay fotografías seleccionadas.";
    dom.publishStatus.textContent = "";
    dom.publishBtn.disabled = true;
}

function resetCollectionForm() {
    dom.collectionTitle.value = "";
    dom.collectionDescription.value = "";
    dom.collectionYear.value = "2026";
    dom.collectionType.value = "portfolio";
    dom.createCollectionStatus.textContent = "";
    dom.createCollectionBtn.disabled = false;
}