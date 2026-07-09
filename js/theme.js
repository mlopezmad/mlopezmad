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

    function normalizePath(path){
        if(!path) return "index.html";
        let clean = path.split('/').pop() || "index.html";
        return clean.toLowerCase();
    }

    function markCurrentMenuItems(){
        const current = normalizePath(window.location.pathname);
        document.querySelectorAll('.site-nav a').forEach(link => {
            try{
                const target = normalizePath(new URL(link.getAttribute('href'), window.location.href).pathname);
                if(target === current){
                    link.setAttribute('aria-current', 'page');
                    link.dataset.currentPage = 'true';
                }else{
                    link.removeAttribute('aria-current');
                    delete link.dataset.currentPage;
                }
            }catch(error){}
        });
    }

    function setupMenus(){
        markCurrentMenuItems();
        document.querySelectorAll('.mobile-menu-button').forEach(button => {
            const id = button.getAttribute('aria-controls');
            const nav = id ? document.getElementById(id) : button.parentElement?.querySelector('.site-nav');
            if(!nav || button.dataset.menuReady === '1') return;
            button.dataset.menuReady = '1';
            button.addEventListener('click', event => {
                event.stopPropagation();
                const isOpen = nav.classList.toggle('is-open');
                button.setAttribute('aria-expanded', String(isOpen));
            });
            nav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    nav.classList.remove('is-open');
                    button.setAttribute('aria-expanded', 'false');
                });
            });
        });

        document.addEventListener('click', event => {
            document.querySelectorAll('.site-nav.is-open').forEach(nav => {
                const header = nav.closest('.site-header');
                if(header && header.contains(event.target)) return;
                nav.classList.remove('is-open');
                const button = header ? header.querySelector('.mobile-menu-button') : null;
                if(button) button.setAttribute('aria-expanded', 'false');
            });
        });
    }

    applyTheme();
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', setupMenus);
    }else{
        setupMenus();
    }

    window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", applyTheme);

})();
