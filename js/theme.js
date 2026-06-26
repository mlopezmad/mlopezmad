(function(){

    function getSystemTheme(){
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }

    function applyTheme(){
        document.documentElement.setAttribute(
            "data-theme",
            getSystemTheme()
        );

        document.documentElement.setAttribute(
            "data-theme-mode",
            "auto"
        );
    }

    applyTheme();

    window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", applyTheme);

})();