const WORKER_URL = "https://mlopezmad-estudio.mlopezmad.workers.dev";

const login = document.getElementById("login");
const panel = document.getElementById("panel");

const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");

const collectionSelect = document.getElementById("collection");
const filesInput = document.getElementById("files");
const preview = document.getElementById("preview");
const fileStatus = document.getElementById("fileStatus");
const publishBtn = document.getElementById("publishBtn");
const publishStatus = document.getElementById("publishStatus");

let password = "";
let selectedFiles = [];

loginBtn.addEventListener("click", () => {
    password = passwordInput.value.trim();

    if (!password) {
        loginStatus.textContent = "Introduce la contraseña.";
        return;
    }

    login.classList.add("hidden");
    panel.classList.remove("hidden");
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

        publishStatus.textContent = `✓ Publicado correctamente. ${data.uploaded} fotografía${data.uploaded === 1 ? "" : "s"} subida${data.uploaded === 1 ? "" : "s"}.`;

        filesInput.value = "";
        selectedFiles = [];
        preview.innerHTML = "";
        fileStatus.textContent = "No hay fotografías seleccionadas.";
        publishBtn.disabled = true;

    } catch (error) {
        publishStatus.textContent = "Error: " + error.message;
        publishBtn.disabled = false;
    }
});

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