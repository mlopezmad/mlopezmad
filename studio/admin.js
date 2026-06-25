const WORKER_URL = "https://mlopezmad-estudio.mlopezmad.workers.dev";

const PROTECTED_COLLECTIONS = [
    "hall-of-fame",
    "madrid",
    "middelburg",
    "rotterdam",
    "iphone4s-cadiz",
    "iphone4s-caceres"
];

const login = document.getElementById("login");
const dashboard = document.getElementById("dashboard");
const panel = document.getElementById("panel");
const collectionPanel = document.getElementById("collectionPanel");
const success = document.getElementById("success");
const collectionSuccess = document.getElementById("collectionSuccess");

const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");

const newPostBtn = document.getElementById("newPostBtn");
const newCollectionBtn = document.getElementById("newCollectionBtn");
const backBtn = document.getElementById("backBtn");
const backFromCollectionBtn = document.getElementById("backFromCollectionBtn");

const collectionSelect = document.getElementById("collection");
const filesInput = document.getElementById("files");
const preview = document.getElementById("preview");
const fileStatus = document.getElementById("fileStatus");
const publishBtn = document.getElementById("publishBtn");
const publishStatus = document.getElementById("publishStatus");

const collectionTitle = document.getElementById("collectionTitle");
const collectionType = document.getElementById("collectionType");
const collectionDescription = document.getElementById("collectionDescription");
const collectionYear = document.getElementById("collectionYear");
const createCollectionBtn = document.getElementById("createCollectionBtn");
const createCollectionStatus = document.getElementById("createCollectionStatus");

const collectionStats = document.getElementById("collectionStats");

const successText = document.getElementById("successText");
const viewGalleryBtn = document.getElementById("viewGalleryBtn");
const newUploadBtn = document.getElementById("newUploadBtn");

const collectionSuccessText = document.getElementById("collectionSuccessText");
const uploadToNewCollectionBtn = document.getElementById("uploadToNewCollectionBtn");
const backToDashboardBtn = document.getElementById("backToDashboardBtn");

let password = "";
let selectedFiles = [];
let lastGalleryUrl = "";
let lastCreatedCollectionPath = "";
let collections = [];

loginBtn.addEventListener("click", async () => {
    password = passwordInput.value.trim();

    if (!password) {
        loginStatus.textContent = "Introduce la contraseña.";
        return;
    }

    login.classList.add("hidden");
    dashboard.classList.remove("hidden");

    await refreshCollections();
});

newPostBtn.addEventListener("click", () => {
    dashboard.classList.add("hidden");
    panel.classList.remove("hidden");
});

newCollectionBtn.addEventListener("click", () => {
    dashboard.classList.add("hidden");
    collectionPanel.classList.remove("hidden");
});

backBtn.addEventListener("click", () => {
    resetUpload();
    panel.classList.add("hidden");
    dashboard.classList.remove("hidden");
});

backFromCollectionBtn.addEventListener("click", () => {
    resetCollectionForm();
    collectionPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
});

filesInput.addEventListener("change", () => {
    selectedFiles = Array.from(filesInput.files || []);
    preview.innerHTML = "";

    if (selectedFiles.length === 0) {
        fileStatus.textContent = "No hay fotografías seleccionadas.";
        publishBtn.disabled = true;
        return;
    }

    selectedFiles.forEach(file => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        preview.appendChild(img);
    });

    const totalMB = selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024;

    fileStatus.textContent = `${selectedFiles.length} fotografía${selectedFiles.length === 1 ? "" : "s"} seleccionada${selectedFiles.length === 1 ? "" : "s"} · ${totalMB.toFixed(1)} MB`;

    publishBtn.disabled = false;
});

publishBtn.addEventListener("click", async () => {
    if (!password || selectedFiles.length === 0) return;

    publishBtn.disabled = true;
    publishStatus.textContent = "Preparando fotografías...";

    try {
        const files = [];

        for (const file of selectedFiles) {
            const content = await fileToBase64(file);
            files.push({
                name: file.name,
                content
            });
        }

        const selectedOption = collectionSelect.options[collectionSelect.selectedIndex];
        lastGalleryUrl = selectedOption.dataset.url || "../portfolio.html";

        publishStatus.textContent = "Subiendo fotografías...";

        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "upload",
                password,
                collectionPath: collectionSelect.value,
                files
            })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.error || "No se pudo publicar.");
        }

        panel.classList.add("hidden");
        success.classList.remove("hidden");

        successText.textContent = `${data.uploaded} fotografía${data.uploaded === 1 ? "" : "s"} publicada${data.uploaded === 1 ? "" : "s"} correctamente.`;

        resetUpload();
        await refreshCollections();

    } catch (error) {
        publishStatus.textContent = "Error: " + error.message;
        publishBtn.disabled = false;
    }
});

createCollectionBtn.addEventListener("click", async () => {
    const title = collectionTitle.value.trim();
    const type = collectionType.value;
    const description = collectionDescription.value.trim();
    const year = collectionYear.value.trim() || new Date().getFullYear();

    if (!title) {
        createCollectionStatus.textContent = "Introduce el nombre de la colección.";
        return;
    }

    createCollectionBtn.disabled = true;
    createCollectionStatus.textContent = "Creando colección...";

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "create_collection",
                password,
                title,
                type,
                description,
                year
            })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.error || "No se pudo crear la colección.");
        }

        lastGalleryUrl = "../" + data.url;
        lastCreatedCollectionPath = data.path;

        collectionPanel.classList.add("hidden");
        collectionSuccess.classList.remove("hidden");

        collectionSuccessText.textContent = `La colección "${data.title}" se ha creado correctamente.`;

        resetCollectionForm();
        await refreshCollections();

    } catch (error) {
        createCollectionStatus.textContent = "Error: " + error.message;
        createCollectionBtn.disabled = false;
    }
});

viewGalleryBtn.addEventListener("click", () => {
    if (lastGalleryUrl) {
        window.open(lastGalleryUrl, "_blank");
    }
});

newUploadBtn.addEventListener("click", () => {
    success.classList.add("hidden");
    panel.classList.remove("hidden");
});

uploadToNewCollectionBtn.addEventListener("click", async () => {
    collectionSuccess.classList.add("hidden");
    panel.classList.remove("hidden");

    await refreshCollections();

    if (lastCreatedCollectionPath) {
        collectionSelect.value = lastCreatedCollectionPath;
    }
});

backToDashboardBtn.addEventListener("click", () => {
    collectionSuccess.classList.add("hidden");
    dashboard.classList.remove("hidden");
});

async function refreshCollections() {
    await loadCollections();
    populateCollectionSelect();
    await loadStats();
}

async function loadCollections() {
    const response = await fetch("../collections.json?t=" + Date.now());
    const data = await response.json();

    collections = (data.collections || []).map(collection => {
        const title = collection.type === "iphone4s"
            ? `iPhone 4s · ${collection.title}`
            : collection.title;

        return {
            id: collection.id,
            name: title,
            path: collection.path,
            json: "../" + collection.json,
            url: "../" + collection.url,
            type: collection.type,
            year: collection.year,
            description: collection.description,
            protected: PROTECTED_COLLECTIONS.includes(collection.id)
        };
    });
}

function populateCollectionSelect() {
    collectionSelect.innerHTML = "";

    collections.forEach(collection => {
        const option = document.createElement("option");
        option.value = collection.path;
        option.dataset.url = collection.url;
        option.textContent = collection.name;
        collectionSelect.appendChild(option);
    });
}

async function loadStats() {
    collectionStats.innerHTML = `<div class="collection-row">Cargando colecciones...</div>`;

    const rows = [];

    for (const collection of collections) {
        let totalText = "No disponible";

        try {
            const response = await fetch(collection.json + "?t=" + Date.now());
            const data = await response.json();
            const total = (data.imagenes || []).length;
            totalText = `${total} ${total === 1 ? "fotografía" : "fotografías"}`;
        } catch (error) {
            totalText = "No disponible";
        }

        rows.push(`
            <div class="collection-row">
                <a href="${collection.url}" target="_blank" style="color:#111;text-decoration:none;">
                    <strong>${collection.name}</strong>
                    <span>${totalText} →</span>
                </a>

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

    collectionStats.innerHTML = rows.join("");
}

async function deleteCollection(id, name) {
    const firstConfirm = confirm(`¿Seguro que quieres eliminar la colección "${name}"?`);

    if (!firstConfirm) return;

    const typed = prompt(`Esta acción eliminará la colección "${name}", su carpeta de imágenes, su galeria.json y su página HTML.\n\nEscribe ELIMINAR para confirmar.`);

    if (typed !== "ELIMINAR") {
        alert("Eliminación cancelada.");
        return;
    }

    collectionStats.innerHTML = `<div class="collection-row">Eliminando colección...</div>`;

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "delete_collection",
                password,
                id
            })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.error || "No se pudo eliminar la colección.");
        }

        alert(`Colección "${data.deleted}" eliminada correctamente.`);
        await refreshCollections();

    } catch (error) {
        alert("Error: " + error.message);
        await refreshCollections();
    }
}

function resetUpload() {
    filesInput.value = "";
    selectedFiles = [];
    preview.innerHTML = "";
    fileStatus.textContent = "No hay fotografías seleccionadas.";
    publishStatus.textContent = "";
    publishBtn.disabled = true;
}

function resetCollectionForm() {
    collectionTitle.value = "";
    collectionDescription.value = "";
    collectionYear.value = "2026";
    collectionType.value = "portfolio";
    createCollectionStatus.textContent = "";
    createCollectionBtn.disabled = false;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(",")[1];
            resolve(base64);
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function escapeQuotes(text) {
    return String(text).replace(/'/g, "\\'");
}