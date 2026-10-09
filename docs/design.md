# Diseño de la interfaz

La interfaz pública usa una escala corta y consistente:

- Texto: `0.7rem` para etiquetas, `0.875rem` para metadatos, `1rem` para
  controles, `1.875rem` para títulos de página y `2.25rem` para el título de una
  obra.
- Espacio: múltiplos de `0.25rem`; las superficies usan `0.75rem` de relleno en
  listas y entre `1.5rem` y `2.5rem` en detalles.
- Color: en las superficies que posee este trabajo —inicio, catálogo, página de
  libro, encabezado, pie, autenticación, perfil y
  [`BookCover`](../src/components/catalogue/book-cover.tsx)— todos los colores
  usan tokens de [`globals.css`](../src/app/globals.css), con valores para claro
  y oscuro. Las páginas de [`src/app/about`](../src/app/about) y los componentes
  de [`src/components/ui`](../src/components/ui) todavía no están migrados y
  quedan fuera de este alcance.

## Componentes

[`BookCover`](../src/components/catalogue/book-cover.tsx) mantiene una relación
fija de 2:3. Una imagen almacenada usa `/media/`; cuando falta, el componente
renderiza una portada tipográfica con el título, autor, categoría y un color
determinista derivado de la categoría. Así una cuadrícula no depende de que la
colección tenga imágenes completas.

La portada recibe `loading="lazy"` debajo del primer tramo visible y dimensiones
fijas. El catálogo ofrece una lista densa y una cuadrícula. La lista conserva
los atajos `/`, flechas y Enter; la búsqueda actualiza el resultado sin perder
el foco. Los filtros de categoría y disponibilidad permanecen visibles.

La página de una obra pone la portada y la acción de préstamo junto al título,
autor, código, categoría y tabla de ejemplares. La disponibilidad sigue siendo
la consulta compartida `copyIsLendable` en
[`src/features/books/sql.ts`](../src/features/books/sql.ts).

## Portadas importadas

`bun run covers:fetch` consulta Open Library una obra a la vez. Normaliza el
título y el primer autor, exige una coincidencia cercana del título, guarda la
respuesta en `.cache/covers/open-library.json` y registra faltantes en
`.cache/covers/misses.json`. Descarga la imagen aceptada al prefijo existente
`book-images/` del bucket R2, registra `/media/book-images/...` en `books` y
`book_images`, y nunca guarda la URL de Open Library.

La fuente del catálogo y el bucket son los bindings locales de Wrangler. El
comando no usa Google Books ni necesita credenciales.

## Capturas revisables

El servidor de producción local debe estar ejecutándose para capturar la
interfaz: `bun run screenshots` escribe las vistas de inicio, catálogo en
cuadrícula y una obra con portada real y generada en `docs/ui/`, en 375 y 1280
píxeles. Para revisar los tokens oscuros se puede ejecutar
`bun run screenshots -- --dark`; esa variante escribe las capturas con el sufijo
`-dark`. El comando requiere Chromium instalado mediante
`bunx playwright install chromium`.
