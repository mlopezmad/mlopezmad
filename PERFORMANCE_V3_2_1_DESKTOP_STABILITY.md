# V3.2.1 Performance · estabilidad escritorio

Ajuste aplicado sobre V3.2 Performance.

## Motivo
En Safari de escritorio algunas galerías podían mostrar parpadeos o huecos al desplazarse. En móvil no ocurría.

## Cambios
- Eliminado `content-visibility:auto` en imágenes y secciones visuales.
- La galería generada por `js/gallery.js` carga las imágenes de forma estable (`eager`) para evitar problemas con columnas en Safari.
- Se mantiene `fetchPriority` para priorizar las primeras imágenes.
- Se mantienen las imágenes optimizadas de V3.2.
- Añadido `.gitignore` para evitar subir `.DS_Store`.

## No se toca
- Studio
- Dashboard
- Worker
- GitHub Actions
- `collections.json`
- `galeria.json`
- estructura de publicación
