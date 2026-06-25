export function qs(id) {
    return document.getElementById(id);
}

export function escapeQuotes(text) {
    return String(text).replace(/'/g, "\\'");
}

export function fileToBase64(file) {
    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result.split(",")[1]);
        };

        reader.onerror = reject;

        reader.readAsDataURL(file);

    });
}

export function show(section) {

    [
        "login",
        "dashboard",
        "panel",
        "collectionPanel",
        "collectionManager",
        "success",
        "collectionSuccess"
    ].forEach(id => {

        const el = document.getElementById(id);

        if (el) {
            el.classList.add("hidden");
        }

    });

    const current = document.getElementById(section);

    if (current) {
        current.classList.remove("hidden");
    }

}