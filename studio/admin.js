const WORKER_URL = "https://mlopezmad-estudio.mlopezmad.workers.dev";

const login = document.getElementById("login");
const dashboard = document.getElementById("dashboard");
const panel = document.getElementById("panel");
const success = document.getElementById("success");

const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");

const newPostBtn = document.getElementById("newPostBtn");
const backBtn = document.getElementById("backBtn");

const collectionSelect = document.getElementById("collection");
const filesInput = document.getElementById("files");
const preview = document.getElementById("preview");
const fileStatus = document.getElementById("fileStatus");
const publishBtn = document.getElementById("publishBtn");
const publishStatus = document.getElementById("publishStatus");

const collectionStats = document.getElementById("collectionStats");

const successText = document.getElementById("successText");
const viewGalleryBtn = document.getElementById("viewGalleryBtn");
const newUploadBtn = document.getElementById("newUploadBtn");

let password = "";
let selectedFiles = [];
let lastGalleryUrl = "";
let collections = [];

loginBtn.addEventListener("click", async () => {
    password = passwordInput.value.trim();

    if (!password) {
        loginStatus.textContent = "Introduce la contraseña.";
        return;
    }

    login.classList.add("hidden");
    dashboard.classList.remove("hidden");

    await loadCollections();
    populateCollectionSelect();
    await loadStats();
});

newPostBtn.addEventListener("click", () => {
    dashboard.classList.add("hidden");
    panel.classList.remove("hidden");
});

backBtn.addEventListener("click", () => {
    resetUpload();
    panel.classList.add("hidden");
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
        await loadStats();

    } catch (error) {
        publishStatus.textContent = "Error: " + error.message;
        publishBtn.disabled = false;
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

async function loadCollections() {
    const response = await fetch("../collections.json?t=" + Date.now());
    const data = await response.json();

    collections = (data.collections || []).map(collection => {
        const title = collection.type === "iphone4s"
            ? `iPhone 4s · ${collection.title}`
            : collection.title;

        return {
            name: title,
            path: collection.path,
            json: "../" + collection.json,
            url: "../" + collection.url,
            type: collection.type,
            year: collection.year,
            description: collection.description
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
        try {
            const response = await fetch(collection.json + "?t=" + Date.now());
            const data = await response.json();
            const total = (data.imagenes || []).length;

            rows.push(`
                <a class="collection-row" href="${collection.url}" target="_blank">
                    <strong>${collection.name}</strong>
                    <span>${total} ${total === 1 ? "fotografía" : "fotografías"} →</span>
                </a>
            `);
        } catch (error) {
            rows.push(`
                <a class="collection-row" href="${collection.url}" target="_blank">
                    <strong>${collection.name}</strong>
                    <span>No disponible →</span>
                </a>
            `);
        }
    }

    collectionStats.innerHTML = rows.join("");
}

function resetUpload() {
    filesInput.value = "";
    selectedFiles = [];
    preview.innerHTML = "";
    fileStatus.textContent = "No hay fotografías seleccionadas.";
    publishStatus.textContent = "";
    publishBtn.disabled = true;
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