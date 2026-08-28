# EL CREW — sitio web

Landing estática (HTML + CSS + JS, sin build step) construida a partir del diseño de Figma
**ElCrew-Website-Review › Desktop - 11** (`QfnauqV41mqcZlIeHZ4Bwb`).

## Estructura

```
elcrew-site/
├── index.html          # Página única
├── css/styles.css      # Tokens, layout, componentes, animaciones, responsive
├── js/main.js          # Header sticky, menú móvil, reveals, scrollspy, formulario
├── assets/
│   ├── icons/          # 28 SVG exportados de Figma (logos, iconos, reglas, bloques)
│   └── img/            # 11 imágenes de clientes/artistas (recortadas a 192×192)
├── netlify.toml        # Publicación, minificación y cabeceras
├── robots.txt
└── sitemap.xml
```

## Desarrollo local

Cualquier servidor estático sirve. Por ejemplo:

```bash
python -m http.server 4173 --directory elcrew-site
```

## Deploy en Netlify

Este repositorio ya es la raíz del sitio.

1. En Netlify: **Add new site → Import an existing project** y elige el repo.
2. Configuración de build — `netlify.toml` ya la define, así que Netlify la toma
   sola. Si te la pide igualmente:
   - **Base directory**: *(vacío)*
   - **Build command**: *(vacío)*
   - **Publish directory**: `.`
3. **Domain settings → Add custom domain** → `somoselcrew.com`. Netlify emite el
   certificado TLS automáticamente una vez que apunten los DNS.

### Formulario de contacto

Usa **Netlify Forms**: el `<form>` lleva `data-netlify="true"` y un honeypot
(`bot-field`). No requiere backend — los envíos aparecen en
**Site → Forms → contacto** en el panel de Netlify.

Para recibir avisos por correo: **Forms → Settings → Form notifications →
Add notification → Email notification**.

El envío se hace por `fetch` desde `js/main.js` para mostrar el estado sin
recargar la página; si JavaScript está deshabilitado, el POST nativo del
formulario también funciona.

## Fidelidad con el diseño

Verificado a 1440px contra las medidas del Figma: cada sección cae dentro de
±1px de su posición y altura, y el documento completo mide 4659px frente a los
4658.18px del artboard.

Se conservaron tal cual los gradientes exportados (hero, pastillas de icono,
banda CTA y footer se reconstruyen con las mismas capas radiales SVG que usa
Figma), la tipografía (Michroma / Roboto / Roboto Flex / Inter) y la retícula
`section > block(1400px) > content`.

### Cambios deliberados sobre el diseño

| Qué | Por qué |
|---|---|
| «propuestra» → «propuesta» (Paso 1) | Errata en el diseño |
| «Estratégia» → «Estrategia» (franja de keywords) | Errata: en español va sin tilde |
| «© 2024» → año dinámico | El diseño quedó con el año viejo |
| Imágenes recortadas a 192×192 | Los originales pesaban 9.4 MB en total (dos de ~4 MB) para avatares de 64px; ahora son 496 KB |
| Franja de keywords en marquesina por debajo de 1240px | A ese ancho ya no caben las 7 palabras con el gap de 92px del diseño; arriba de 1240px se mantiene estática y exacta |

### Pendientes de decisión

- La **tercera tarjeta de clientes** (Babilonia Music, ancha) repite el cliente y
  dos de los proyectos de la primera. Está implementada como aparece en el
  Figma, pero probablemente sobra.
- El nav mezcla idiomas: «Home», «Nosotros», **«Services»**. Se dejó como en el
  diseño por si es intencional.
- Faltan por definir el enlace real de Instagram (ahora apunta a
  `instagram.com/somoselcrew`) y una imagen para Open Graph
  (`og:image`) — sin ella, al compartir el link no se ve miniatura.

## Animaciones

Todas respetan `prefers-reduced-motion`.

- Hero: entrada del logo y deriva lenta del halo radial
- Header: se fija al hacer scroll, la franja superior se colapsa y aparece sombra
- Nav: subrayado que crece desde el centro; enlace activo según la sección visible
- Cohete: flotación continua
- Cards de servicio: elevación, barrido de luz y giro del icono al hover
- Pasos: la línea se dibuja al entrar en pantalla; el icono se eleva al hover
- CTA: el degradado se desplaza lentamente
- Clientes: elevación de tarjeta, avatar y miniaturas
- Botones: efecto de hundido (el borde inferior de 4px se come al presionar)
- Revelado progresivo de secciones con `IntersectionObserver` y retardos escalonados
