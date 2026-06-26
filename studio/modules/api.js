import { WORKER_URL } from "./config.js";

export async function loadCollectionsData() {
    const response = await fetch("../collections.json?t=" + Date.now());

    if (!response.ok) {
        throw new Error("No se pudo cargar collections.json");
    }

    return await response.json();
}

export async function loadGalleryJson(jsonPath) {
    const response = await fetch(jsonPath + "?t=" + Date.now());

    if (!response.ok) {
        throw new Error("No se pudo cargar la galería");
    }

    return await response.json();
}

export async function workerRequest(payload) {
    const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || "Error en Studio");
    }

    return data;
}

export async function getDeployStatus(password) {
    const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action: "deploy_status",
            password
        })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo consultar el despliegue");
    }

    return data;
}