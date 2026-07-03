# mlopezmad Web — V2 visual inicial

Primera versión de la nueva piel visual para la web pública.

## Alcance

Cambios centrados en la capa estética de la web pública:

- Nueva home con hero inmersivo, navegación superior, botones y bloque de métricas.
- Tipografía de sistema estilo Apple: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Display`, `SF Pro Text`, `Helvetica Neue`, `Arial`, `sans-serif`.
- Nueva sección dinámica “Selección reciente” leyendo `collections.json`.
- Nuevo portfolio visual con tarjetas fotográficas grandes.
- Galerías rediseñadas visualmente desde `js/gallery.js`, manteniendo filtros, lightbox, flechas y gestos.
- Páginas públicas secundarias ajustadas al nuevo lenguaje visual.
- Sin fuentes externas ni dependencias nuevas.

## No se ha tocado

- `studio/`
- Worker real / lógica de Cloudflare
- `collections.json`
- `galeria.json`
- imágenes
- estructura de carpetas de galerías
- flujo de publicación desde Studio

## Archivos principales modificados

- `index.html`
- `style.css`
- `portfolio.html`
- `js/gallery.js`
- `js/home.js` nuevo
- `js/portfolio.js` nuevo
- páginas públicas: `series.html`, `sobre-mi.html`, `newsletter.html`, `contacto.html`, `iphone4s.html`, `editors-choice.html`, etc.

## Comprobaciones realizadas

- Validación sintáctica de JavaScript con `node --check`.
- Comprobación de JSON existentes.
- Comprobación de referencias locales básicas en HTML.
- Comparación para confirmar que `studio/`, `images/` y `collections.json` no se han modificado.

## Nota

Esta versión está pensada como primera base visual para revisar en navegador real, especialmente en iPhone. Si algo no encaja, el rollback recomendado es restaurar los archivos visuales desde el ZIP de respaldo actual.
