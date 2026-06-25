import { dom } from "./modules/dom.js";
import { state } from "./modules/state.js";
import { show, fileToBase64 } from "./modules/utils.js";
import { workerRequest, loadGalleryJson } from "./modules/api.js";
import { refreshCollections, deleteCollection } from "./modules/collections.js";

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
    dom.preview.innerHTML = "";

    if (state.selectedFiles.length === 0) {
        dom.fileStatus.textContent = "No hay fotografías seleccionadas.";
        dom.publishBtn.disabled = true;
        return;
    }

    state.selectedFiles.forEach(file => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        dom.preview.appendChild(img);
    });

    const totalMB = state.selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024;

    dom.fileStatus.textContent =
        `${state.selectedFiles.length} fotografía${state.selectedFiles.length === 1 ? "" : "s"} seleccionada${state.selectedFiles.length === 1 ? "" : "s"} · ${totalMB.toFixed(1)} MB`;

    dom.publishBtn.disabled = false;
});

dom.publishBtn.addEventListener("click", async () => {
    if (!state.password || state.selectedFiles.length === 0) return;

    dom.publishBtn.disabled = true;
    dom.publishStatus.textContent = "Preparando fotografías...";

    try {
        const files = [];

        for (const file of state.selectedFiles) {
            const content = await fileToBase64(file);

            files.push({
                name: file.name,
                content
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
    const collection = state.collections.find(item => item.id === id);

    if (!collection) return;

    state.currentCollection = collection;

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

        dom.managerPhotos.innerHTML = imagenes.map((imagen, index) => {
            const archivo = imagen.archivo || imagen.file || "";
            const tipo = imagen.tipo || imagen.type || "bn";

            return `
                <div class="photo-card">
                    <img src="${basePath + archivo}" alt="${archivo}">
                    <p>${archivo}</p>
                    <p>${tipo === "color" ? "Color" : "Blanco y negro"}</p>

                    <div class="photo-actions">
                        <button type="button" class="secondary" onclick="previewPhoto('${basePath + archivo}')">
                            Ver
                        </button>
                    </div>
                </div>
            `;
        }).join("");

    } catch (error) {
        dom.managerMeta.textContent = "No se pudo cargar la colección.";
        dom.managerPhotos.innerHTML = `<p class="status">${error.message}</p>`;
    }
};

window.previewPhoto = (url) => {
    window.open(url, "_blank");
};

function resetUpload() {
    dom.filesInput.value = "";
    state.selectedFiles = [];
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