(function(){
    const STORAGE_KEY = "mlopezmad-theme";
    const MODES = ["auto", "light", "dark"];

    function getStoredTheme(){
        return localStorage.getItem(STORAGE_KEY) || "auto";
    }

    function getSystemTheme(){
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function getEffectiveTheme(mode){
        return mode === "auto" ? getSystemTheme() : mode;
    }

    function applyTheme(mode){
        const effective = getEffectiveTheme(mode);
        document.documentElement.setAttribute("data-theme", effective);
        document.documentElement.setAttribute("data-theme-mode", mode);
        updateButton(mode);
    }

    function getLabel(mode){
    if(mode === "light") return "○ Claro";
    if(mode === "dark") return "● Oscuro";
    return "◐ Auto";
}

    function updateButton(mode){
        const button = document.querySelector("[data-theme-toggle]");
        if(button){
            button.textContent = getLabel(mode);
            button.setAttribute("aria-label", "Cambiar tema: " + getLabel(mode));
        }
    }

    function nextMode(current){
        const index = MODES.indexOf(current);
        return MODES[(index + 1) % MODES.length];
    }

    function createButton(){
        if(document.querySelector("[data-theme-toggle]")) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "theme-toggle";
        button.setAttribute("data-theme-toggle", "");
        button.addEventListener("click", () => {
            const current = getStoredTheme();
            const next = nextMode(current);
            localStorage.setItem(STORAGE_KEY, next);
            applyTheme(next);
        });

        document.body.appendChild(button);
        updateButton(getStoredTheme());
    }

    const initial = getStoredTheme();
    applyTheme(initial);

    window.addEventListener("DOMContentLoaded", () => {
        createButton();
        applyTheme(getStoredTheme());
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if(getStoredTheme() === "auto"){
            applyTheme("auto");
        }
    });
})();