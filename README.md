# EL CREW — sitio web

Landing estática (HTML + CSS + JS, sin build step) del diseño de Figma
**ElCrew-Website-Review** (`QfnauqV41mqcZlIeHZ4Bwb`).

Referencia vigente:

- **Mockups migrados al sistema de diseño**: sección «El Crew / Migrated
  mockups — ascending breakpoints» (`2115:4967`). Frames de 390 (`2115:4968`,
  y «Scenario» `2115:5121` con las redes agregadas), 920 (`2115:5274`),
  1200 (`2115:5470`), 1440 (`2115:5668`), 1920 y 2000.
- **Sistema de diseño**: página «Design System» (`2037:15614`): paleta,
  tipografía, espaciado y componentes (botones, campos, chips, filas de
  servicio, selector, cabecera, pie).
- Animación del proceso: el video de referencia del equipo (3 de octubre de
  2026, «WhatsApp Video 2»), que reemplaza al frame `Process-secuence`
  (`2028:8056`).

Los mockups anteriores (`2016:1883`) quedaron reemplazados por los migrados.

### Tokens del sistema de diseño en `styles.css`

| Token del Figma | Variable | Valor |
|---|---|---|
| text-primary (Neutral/800) | `--tinta` | #262626 |
| surface-dark (Neutral/900) | `--zinc` | #171717 |
| text-muted (Neutral/600) | `--gris` | #525252 |
| border-default (Neutral/500) | `--linea` | #737373 |
| text-inverse | `--claro` | #f5f5f5 |
| text-on-red | `--claro-rojo` | #fafafa |
| brand blue / red / yellow | `--azul` / `--rojo` / `--lima` | #2b00ff / #d51115 / #d4d916 |

Cuerpo: 16/24 en móvil y 18/26 en escritorio (las etiquetas de sección
también). Navegación 18/26.

## Estructura

```
elcrew-site/
├── index.html          # Página única
├── css/styles.css      # Tokens, componentes y los cuatro tramos responsivos
├── js/main.js          # Interacciones (sin dependencias)
├── assets/
│   ├── v2/             # Assets exportados del Figma vigente (SVG + WebP)
│   └── img/            # Fotos de clientes (192×192)
├── netlify.toml        # Publicación y cabeceras
├── robots.txt
└── sitemap.xml
```

`.tools/` (ignorado en git) tiene los scripts de captura y prueba con Chromium
headless; no se publica.

## Desarrollo local

```bash
python -m http.server 4173 --directory elcrew-site
```

El formulario **no envía en local** (el servidor de Python no acepta POST):
funciona sólo en Netlify.

## Tramos responsivos

Salen de los frames del archivo, no de una suposición:

| Ancho        | Qué hace                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| < 900 px     | Diseño móvil (frame de 390)                                              |
| 900–1199 px  | Estructura de escritorio con tipografía móvil (frame de 920)            |
| 1200–1439 px | Escritorio a tamaño real, columnas fluidas (frame de 1200)              |
| ≥ 1440 px    | Escala proporcional: `1rem = 100vw / 90` (frames de 1920 y 2000, y la nota «el contenido escala proporcional») |

Todo se mide en `rem` para que el último tramo escale entero.

## Interacciones

Todo respeta `prefers-reduced-motion` y el contenido queda completo si el JS
no carga.

- **Scroll por pantallas** (escritorio con mouse o trackpad): cada gesto
  lleva con una transición suave (0.65–0.95 s, *ease-in-out*) a la parada
  siguiente: 1 cabecera + hero · 2 banda + Nosotros · 3 Servicios ·
  4 Proceso · 5 Clientes · 6 Contacto · 7 pie. En las secciones más altas
  que la ventana (Servicios, a veces Contacto) el scroll es libre hasta su
  final. Proceso, en cambio, tiene una parada por etapa (un gesto = una
  etapa, con saltos de 1.5 s). La inercia del trackpad no encadena saltos. Igual con
  AvPág / RePág / espacio / flechas y con los enlaces internos. Lo hace
  `main.js`; sin JS, el `scroll-snap` del CSS da una versión básica. En
  pantallas táctiles y con «reducir movimiento» el scroll es normal.
- **Una sección = una pantalla**: hero, Nosotros y Clientes miden el alto de
  la ventana. El hero y Nosotros usan `--k`, un «rem» que baja con la altura
  de la ventana para que el arte y la tipografía grande quepan completos
  (probado de 1280 × 632 a 2560 × 1300); el texto chico no cambia.
- **«¿Qué hacemos?»** se queda fijo mientras la lista de servicios sube; baja
  a la par de la cabecera cuando ésta reaparece.
- **Cabecera**: se disuelve al bajar y vuelve al subir (patrón *hide on scroll
  down / show on scroll up*, como Headroom.js), con 10 px de tolerancia.
  También aparece al pasar el cursor por la franja superior (tras 120 ms) y
  al llegar con el tabulador. Al saltar a una sección desde un enlace interno
  queda oculta y la sección llega al borde superior; si el foco cae en algo
  que taparía, se quita. En pantallas táctiles, oculta no atrapa toques.
- **Budy** (la bocina del hero): camina y silba en loop de 2.67 s
  (`assets/v2/budy-camina.svg`, SVG animado sólo con CSS, sacado de
  `identidad/budy-animacion`). Con movimiento reducido el `<picture>` carga
  `budy-quieto.svg`, la pose del Figma. Su viewBox comparte coordenadas con el
  recuadro de la bocina del Figma; las cuentas están en `styles.css`.
- **Insignia «Vibe with us» como vinilo**: disco negro con surcos, etiqueta
  lima con la estrella y el texto a radio 40 de 60. Gira en sentido horario,
  una vuelta cada 6 s (`--vuelta` en `.insignia`); el reflejo se queda quieto.
- **Animaciones de entrada**: cada pieza con `data-entra` aparece al asomar en
  pantalla (`sube`, `aparece`, `derecha`, `escala`, `linea` para titulares
  que suben desde una máscara, `cortina` para el paralelogramo, `vinilo`,
  `logo`, `trazo`). `--i` ordena la coreografía (90 ms por paso). La clase
  `.js` se pone en el `<head>` para que no haya parpadeo; si `main.js` no
  corre, a los 3 s se quita y todo queda visible.
- **Trazos** (garabato, subrayado de «Amplificado», subrayados de Nosotros,
  squiggle de Clientes): son SVG dentro del HTML y se dibujan al entrar,
  como un *trim path* (`pathLength="1"` + `stroke-dashoffset`).
- **Subrayados de Nosotros**: ondulan como una cuerda (una onda senoidal que
  corre por el trazo, con los extremos casi quietos). Llegan vibrando al
  entrar la sección y se calman; al pasar el cursor por la palabra (o
  tocarla) la onda crece y se acelera. Sólo corre con Nosotros a la vista.
- **Titular «Tu talento / amplificado»** (la línea de abajo, en contorno y
  subrayada, es la más ancha, como en el diseño): su tamaño es el del diseño
  (80 en móvil, 128 en escritorio) o lo que quepa en la columna, lo que sea
  menor (`19.8cqi`, calculado para «AMPLIFICADO»; si cambia el texto, medir
  con `.tools/titular.sh`). La segunda línea se estira a lo ancho, con su
  subrayado, en la primera mitad del hero al hacer scroll (hasta +35 %, o lo
  que quepa en la columna).
- **Botones principales** («Solicitar Campaña», «Contáctanos», «Solicitar
  Consulta», «Agregar»): rojo de la marca en hover. La flecha avanza y su
  cola ondula como si nadara (animación de la propiedad `d`; en Safari sólo
  avanza). El botón rojo de los servicios invierte a fondo claro.
- **«Ver Servicios»**: el texto avanza y la línea se recorre (sale por la
  derecha y vuelve por la izquierda).
- **Banda amarilla**: carrusel que no se detiene (nota del diseñador). Con
  movimiento reducido se queda quieta.
- **Selector** (Marketing / Consultoría y el filtro de clientes en móvil): el
  fondo de la opción elegida es una pastilla «líquida». Al pasar el cursor
  por la otra opción se estira hacia el cursor y pasa por detrás de esa
  palabra (cuanto más adentro, más la cubre); las letras que cubre se ven
  oscuras sobre claro (dentro de la pastilla hay una copia oscura de las
  etiquetas, recortada con `clip-path`). El borde que se estira se redondea
  como una gota y la pastilla se adelgaza un poco. Al elegir, cada borde va
  con su resorte: el de adelante corre y el de atrás lo alcanza con un
  pequeño rebote. Flechas del teclado en las pestañas.
- **Servicios**: acordeón con un solo servicio abierto; todos empiezan
  cerrados (frame de 1440) y sólo llevan texto. Al pasar el cursor el fondo
  rojo barre de izquierda a derecha (así se nota que se abre) y sale por la
  derecha al irse; en pantallas táctiles no hay hover. Sin el aviso «Toca un
  servicio para abrirlo». Abre y cierra animando la
  altura (0.48 s, Web Animations API; cerrado sigue siendo `[hidden]`). El
  botón del servicio abierto es «Primary button / Red». «Solicitar consulta»
  anota el servicio en el formulario.
- **Instagram de la cabecera**: en hover, círculo lima y el ícono gira con
  rebote.
- **Proceso (escritorio, desde 900 px)**: un escenario fijo de una pantalla
  dentro de una sección de cuatro (las tres etapas y la salida), copiado del
  video de referencia:
  - Una sola línea lima recorre todo el proceso como un *trim*: crece por
    delante y se borra por detrás. Sale de detrás de «idea», baja en arco
    hasta la etapa 1 y sigue en ondas; los puntos de las etapas son los
    extremos derechos de la onda.
  - Entre etapas la línea baja primero hacia la izquierda y después una
    «cámara» la sigue hacia abajo, hasta que el punto siguiente queda en el
    mismo lugar de la pantalla (la etapa 3, más abajo, como en el video).
  - El fondo pasa del rojo al azul: #c30041 → #81008d → #3100ec (arriba de
    la pantalla; abajo un poco más azul).
  - Al estacionarse, el punto aparece con un rebote y late; el texto de la
    etapa entra desde la derecha y sale hacia la derecha antes de que la
    línea arranque.
  - Al llegar a la sección la línea sale sola del titular hasta la etapa 1.
    Las demás van con el scroll, pero la animación sigue a su propio ritmo
    (3.4 s de etapa a etapa, 2.2 s el dibujo inicial, más rápida la
    salida) y acelera si el scroll se le adelanta. Con scroll libre cada
    etapa tiene una pausa para que la línea se quede estacionada.
  - Con «reducir movimiento» salta de etapa en etapa sin animar. Sin JS se
    ve el titular y las tres etapas en lista.
  - Lo traza `main.js` («Proceso») a partir de las medidas reales (dónde
    termina «De la idea», el alto de la ventana), así que se adapta a
    cualquier tamaño. Prueba: `.tools/proceso.sh`.
- **Proceso (móvil)**: la curva se descubre con el scroll y los puntos se
  encienden al llegar a ellos; fondo en degradé del rojo al azul.
- **Clientes (escritorio)**: la marquesina frena de a poco al entrar el
  cursor en la fila (velocidad 1 → 0 en 0.7 s) y vuelve a arrancar igual al
  salir. Al pasar por un nombre se pone amarillo y los demás se disuelven
  (25 %); el retrato circular de 80 px («Desktop client name / Hover» del
  sistema de diseño) aparece donde el cursor toca el nombre y lo sigue con
  inercia. Con el teclado aparece sobre el nombre enfocado.
- **Artistas y disqueras** (`data-sello` en cada nombre): al pasar por un
  artista también se pone amarilla su disquera; al pasar por una disquera
  se ponen amarillos sus artistas que estén a la vista y la marquesina de
  artistas frena para poder leerlos. Babilonia Music: Cartel de Santa,
  Barbarela, Eduardo III, Richard Ahumada. Virgin Music: Neto Peña, El
  Malilla, Dani Flow, Rico o Muerto. En la marquesina van intercalados
  (uno de cada disquera) para que siempre haya de las dos a la vista.
- **Clientes (móvil)**: filtro Todo / Artistas / Marcas con conteos automáticos.
- **Formulario**: rol (ninguno preseleccionado; chip oscuro al pasar el
  cursor, azul al elegir), redes sociales y validación con el estado de error
  del diseño. Las redes empiezan vacías: «Agregar» muestra Instagram,
  Facebook, X, YouTube y Otra, en ese orden, y después agrega más filas
  «Otra». El bote de basura oculta (y vacía) las cinco fijas y elimina las
  agregadas.

## SEO y etiquetas

- **Título** (51 caracteres) y **descripción** (155) dentro de lo que Google
  muestra completo. Canónica `https://somoselcrew.com/` (el `www` ya
  redirige ahí en Netlify) y `robots` con `max-image-preview:large`.
- **Al compartir**: Open Graph y X completos (título «EL CREW — Tu talento,
  amplificado», descripción, imagen de 1200 × 630 con su texto
  alternativo). La imagen es `assets/v2/og-el-crew.jpg`, una captura del
  hero que genera `.tools/titular.sh`; si cambia el hero, se regenera **con
  otro nombre** (ver «Caché») y se actualizan las cuatro etiquetas que la
  usan.
- **Íconos**: `favicon.svg` (logo blanco sobre el azul de la marca, se ve en
  pestañas claras y oscuras), `favicon-48.png` de respaldo y
  `apple-touch-icon.png` de 180. Se generan con `.tools/iconos.sh`.
- **Datos estructurados** (JSON-LD): `Organization` (logo de 512, correo,
  Ciudad de México, territorios, servicios, Instagram) y `WebSite`, para el
  nombre del sitio en los resultados.
- **Etiquetado**: un solo `h1`, un `h2` por sección y `h3` en servicios,
  etapas y filas de clientes; todas las imágenes con `alt` (vacío en las
  decorativas); el arte del hero es decorativo salvo los territorios, que sí
  se leen. Prueba: `.tools/seo.sh`.
- `sitemap.xml`: actualizar `lastmod` al publicar cambios de contenido.

## Formulario (Netlify Forms)

Se conserva el nombre `contacto`, así que los envíos siguen llegando al mismo
formulario en **Site → Forms**. Campos nuevos: `rol`, `red_*`, `redes`,
`proyecto` y `servicio`.

Las cinco filas fijas (`red_instagram`, `red_facebook`, `red_x`,
`red_youtube`, `red_otra`) están en el HTML aunque empiecen ocultas, así que
Netlify las registra. Las filas «Otra» extra que el visitante agrega no
existen en el HTML publicado, y Netlify sólo guarda campos que detecta al
publicar; por eso todas las redes visibles se mandan además juntas en el
campo oculto `redes`.

## Caché

`netlify.toml` marca `/assets/*` como inmutable por un año. **Nunca reemplaces
un archivo de `assets/` con el mismo nombre**: quien ya lo descargó seguiría
viendo el viejo. Usa un nombre nuevo. El CSS y el JS llevan `?v=` en el HTML;
súbelo cuando cambien.

## Cambios deliberados sobre el diseño

| Qué | Por qué |
|---|---|
| «Procese» → «Proceso», «Services» → «Servicios», «Other» → «Otra» | Erratas y mezcla de idiomas en la versión en español |
| Selector ES / EN oculto | No hay versión en inglés todavía; un selector que no lleva a nada es peor que no tenerlo. Se activa quitando `hidden` en `.idioma` |
| Insignia en móvil hecha con texto real, no con la imagen plana del frame | La nota pide que gire; una imagen plana no puede |
| Clientes en móvil: 10 tarjetas reales en vez de 6 de relleno | El frame repite «Cartel de Santa» sobre círculos negros |
| Imágenes en WebP | 921 KB → 61 KB sin pérdida visible |
| Arte del hero en móvil vivo (Budy animado, insignia que gira), no la imagen plana de 410 × 494 del frame de 390 | La imagen del frame tiene otras proporciones (paralelogramo achatado) y no puede animarse |
| Servicios cerrados al cargar en todos los anchos | El frame de 1440 (y los de 1920/2000) los muestra cerrados; los de 390, 920 y 1200 muestran el 04 abierto como ejemplo del estado activo |

## Pendientes de contenido

- **Descripciones de los 12 servicios**: el Figma sólo trae lorem ipsum; los
  textos actuales son un borrador para revisar.
- **Imágenes de servicio**: por ahora los servicios van sólo con texto (se
  quitó la de Influencer marketing para que todos sean iguales).
- **Fotos de clientes**: el retrato del hover mide 80 px y las de
  `assets/img/` son de 192 px, suficiente aun en pantallas retina.
- **Versión en inglés** para activar el selector de idioma (cuando exista,
  agregar `hreflang` es/en en el `<head>`).

## Pendiente de validar con diseño

- **Lima sobre el rojo del proceso**: «Proceso» y «Etapa 01» en lima sobre
  #c30041 dan un contraste de 4.0:1 (el mínimo AA para texto de 18 px es
  4.5:1). En el azul de las etapas 2 y 3 sí cumple. Se dejó como en el
  video.

- El sistema de diseño confirma tipografía de escritorio **desde 921 px**,
  pero la composición para 921–1199 px («Desktop: desktop navigation with
  compact layout») es sólo una propuesta y no hay frame. Mientras tanto ese
  tramo usa la tipografía móvil del frame de 920 (con 128 px el titular no
  cabe junto al arte a ~1000 px).
