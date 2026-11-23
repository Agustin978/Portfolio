# Mapa de contenido del sitio público

De dónde sale cada texto del diseño (`Portfolio.dc.html`) y de las pantallas que agrega el plan de la Fase 6 (experiencia, detalle, 404, formulario y estados). Fuente de verdad de la API: `docs/api.md`.

## Reglas

- Ningún texto visible queda fijo en el código: sale de la API o de i18n (`client/src/i18n/es.json` y `en.json`). Solo son código los separadores («·», «—», «©») y las flechas, estas con `aria-hidden`.
- **Un campo opcional que llega `null` oculta su elemento completo**, sin etiquetas, separadores ni íconos huérfanos. Ejemplos: sin `cvUrl` no hay botón «Descargar CV»; sin `role` el eyebrow muestra solo `location` y sin el «·»; sin `companyUrl` la empresa va como texto.
- Una sección que queda vacía (experiencia, skills, redes) se oculta con su enlace del menú. Proyectos muestra su mensaje de vacío.
- El idioma de los datos sale de la URL (`/es`, `/en`), no del estado de i18n.
- Las anclas de las secciones son las mismas en los dos idiomas (`#proyectos`, `#sobre-mi`, `#contacto`), así un enlace compartido como `/en#contacto` funciona.
- Todo lo que viene de la API se renderiza como texto, nunca como HTML.

## Página y layout

| Texto                                                      | Fuente                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `<title>`                                                  | `{fullName} · {meta.title}`; en la 404, `{notFound.title} · {fullName} · {meta.title}`; sin perfil, solo `meta.title` |
| «Saltar al contenido»                                      | i18n `nav.skip`                                                                                |
| Logo «Agustín»                                             | `/profile` → `fullName`; nombre accesible y `title`: i18n `nav.home` («{nombre}, ir al inicio»; sin perfil, con `meta.title`) |
| Menú Proyectos / Sobre mí / Experiencia / Contacto         | i18n `nav.projects`, `nav.about`, `nav.experience`, `nav.contact`                              |
| Nombre accesible del menú («Principal»)                    | i18n `nav.label`                                                                               |
| Selector ES / EN                                           | i18n `language.es`, `language.en` (texto visible), `language.names.es` / `language.names.en` («Español» / «English»: `aria-label` y `title`, cada uno en su idioma) y `language.label` (grupo) |
| Footer «© 2026 Agustín · San Miguel de Tucumán, Argentina» | Año calculado + `/profile` → `fullName` + `location` (sin `location`, se omite también el «·») |
| «Volver arriba»                                            | i18n `footer.top`                                                                              |

## Hero

| Texto                                   | Fuente                                                              |
| --------------------------------------- | ------------------------------------------------------------------- |
| «Desarrollador · San Miguel de Tucumán» | `/profile` → `role` · `location` (omite el que sea `null`)          |
| H1                                      | `/profile` → `headline`; si es `null`, `fullName` (la página necesita su h1; mientras carga o falla, un h1 oculto con `meta.title`) |
| Bajada «Soy Agustín…»                   | `/profile` → `intro`                                                |
| «Ver proyectos», «Contacto»             | i18n `hero.projects`, `hero.contact`                                |
| «Descargar CV» (no está en el canvas)   | i18n `hero.cv`; enlace a `/profile` → `cvUrl`, solo si no es `null` |

## Proyectos (lista)

| Texto                                                    | Fuente                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| «Proyectos»                                              | i18n `projects.title`                                                                       |
| Etiqueta del filtro («Filtrar proyectos por categoría»)  | i18n `projects.filterLabel`; el filtro aparece solo con dos o más categorías en uso         |
| «Todos»                                                  | i18n `projects.all`                                                                         |
| Chips Web / IA / Redes                                   | `/project-categories` → `name` (el `slug` va a `?category=`)                                |
| Imagen de la tarjeta y su `alt`                          | `/projects` → `cover` (`url`, `width`, `height`, `alt`; si `alt` es `null`, se usa `title`) |
| Categoría, título y resumen                              | `category.name`, `title`, `summary`                                                         |
| Chips del stack                                          | `technologies[].name` (sin tecnologías, no hay fila de chips)                               |
| «Ver detalle» y nombre accesible «Ver detalle: {título}» | i18n `projects.detail` y `projects.detailFor`                                               |
| «Todavía no hay proyectos publicados»                    | i18n `projects.empty`                                                                       |

## Sobre mí

| Texto                                         | Fuente                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| «Sobre mí»                                    | i18n `about.title`                                                                              |
| Párrafos de la bio                            | `/profile` → `bio`, separada por líneas en blanco                                               |
| Grupos «Desarrollo / Datos / Infraestructura» | `/skills` → `group`, traducido con i18n `skills.groups.{development,data,infrastructure,other}` |
| «Laravel · Livewire · …»                      | `/skills` → `technologies[].name`                                                               |

## Experiencia (no está en el canvas; decisión 5.1 del plan)

| Texto                          | Fuente                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| «Experiencia»                  | i18n `experience.title`                                                                    |
| Fechas «ENE 2022 — ACTUALIDAD» | `/experiences` → `startDate` y `endDate`, con `Intl.DateTimeFormat` en UTC según el idioma |
| «Actualidad» / «Present»       | i18n `experience.present` (cuando `endDate` es `null`)                                     |
| Rol                            | `role`                                                                                     |
| Empresa · Lugar                | `company` (enlace si hay `companyUrl`) · `location` (sin `location`, sin «·»)              |
| Descripción                    | `description`, en párrafos                                                                 |
| Chips                          | `technologies[].name`                                                                      |

## Detalle de proyecto (`/:lang/projects/:slug`)

| Texto                                                  | Fuente                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| «← Proyectos»                                          | i18n `projectDetail.back`                                                                      |
| Categoría, título y resumen                            | `/projects/:slug` → `category.name`, `title`, `summary`                                        |
| Línea de fechas                                        | `startedAt` y `endedAt`, mismo formato que experiencia (ver reglas de fechas abajo)            |
| «Ver sitio ↗», «Ver código ↗»                          | i18n `projectDetail.live`, `projectDetail.repo`; cada uno solo si existe `liveUrl` o `repoUrl` |
| «(se abre en otra pestaña)», solo lectores de pantalla | i18n `common.newTab`                                                                           |
| Portada, galería y `alt` de cada imagen                | `images[]` (si `alt` es `null`, se usa `title`); galería solo con más de una imagen            |
| Etiqueta del grupo de miniaturas                       | i18n `projectDetail.gallery`                                                                   |
| «Imagen {n} de {total}» (nombre de cada miniatura)     | i18n `projectDetail.showImage`                                                                 |
| Descripción                                            | `description`, en párrafos                                                                     |
| «Tecnologías:»                                         | i18n `projectDetail.technologies` (sin tecnologías, no se muestra la etiqueta)                 |

**Fechas del detalle:**

- `startedAt` y `endedAt` `null`: no se muestra la línea de fechas.
- `startedAt` con valor y `endedAt` `null`: «{inicio} — Actualidad» (i18n `experience.present`).
- Ambas con valor: «{inicio} — {fin}».
- Solo `endedAt` con valor: solo «{fin}».
- Vale también para experiencia: cada fecha (mes y año) y «Actualidad» son unidades que no se cortan, y el guion va pegado a la primera fecha con un espacio no separable. El único salto posible es después del guion. En la columna de 140 px (la misma de las skills) cualquier rango queda en dos líneas, «MAR 2019 —» / «DIC 2021»; la unidad más ancha, «ACTUALIDAD», mide 83 px.

**Reglas de la página y de la sección** (PR 5):

- Experiencia va después de «Sobre mí», con su enlace en el menú en ese orden (`#experiencia`). Se oculta, enlace incluido, solo cuando la API responde una lista vacía; cargando o con error, queda (el error con su «Reintentar»).
- Las `images` de una experiencia no se muestran: el diseño de la sección no las prevé.
- `PROJECT_NOT_FOUND` muestra la 404 con `notFound.project`; cualquier otro error deja la página con su «Reintentar». Mientras carga o si falla, el h1 queda oculto con `projects.title`.
- «← Proyectos»: si se llegó desde una tarjeta, vuelve en el historial (con filtro y scroll); si se abrió directo, enlaza a `/{lang}#proyectos`.
- `<title>` del detalle: `{title} · {fullName} · {meta.title}`; en su 404, `{notFound.title} · {fullName} · {meta.title}`. Lo pone el `<title>` de React 19 de cada página, así que al volver a la Home queda el general (`{fullName} · {meta.title}`).

## Contacto

| Texto                                             | Fuente                                                                                                                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Trabajemos juntos.»                              | i18n `contact.title`                                                                                                                                                                         |
| «Estoy abierto a oportunidades…»                  | `/profile` → `availability`; si es `null`, i18n `contact.lead`                                                                                                                               |
| Botón de correo                                   | `/profile` → `publicEmail` (`mailto:`; oculto si es `null`)                                                                                                                                  |
| GitHub / LinkedIn y otras redes                   | `/social-links` → `platform` y `url`; etiqueta i18n `social.<platform>`, si no hay clave el nombre capitalizado. Ícono: solo GitHub (Simple Icons); LinkedIn y cualquier otra, genérico de enlace |
| Etiquetas Nombre / Email / Mensaje                | i18n `form.name`, `form.email`, `form.message`                                                                                                                                               |
| Contador «0/5000»                                 | i18n `form.counter` (el límite sale del esquema)                                                                                                                                             |
| «Enviar mensaje», «Enviando…»                     | i18n `form.submit`, `form.sending`                                                                                                                                                           |
| Errores por campo                                 | i18n `form.errors.*` (`required`, `nameTooLong`, `nameInvalid`, `emailInvalid`, `messageTooShort`, `messageTooLong`)                                                                         |
| Envío limitado (429)                              | i18n `form.errors.rateLimited`                                                                                                                                                               |
| Éxito «Recibí tu mensaje» y «Enviar otro mensaje» | i18n `form.success.title`, `form.success.body`, `form.success.again`                                                                                                                         |
| Alternativa «escribime a {correo}»                | i18n `form.fallback` + `publicEmail` (sin `publicEmail`, no se muestra)                                                                                                                      |

## Errores, 404 y estados

| Texto                                      | Fuente                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 404: título, texto y «Volver al inicio»    | i18n `notFound.title`, `notFound.body`, `notFound.home`                                      |
| Proyecto inexistente (`PROJECT_NOT_FOUND`) | i18n `notFound.project`                                                                      |
| Errores de sección                         | i18n `errors.network`, `errors.timeout`, `errors.server`, `errors.invalid`, `errors.generic` |
| «Reintentar»                               | i18n `errors.retry`                                                                          |
| Aviso de servidor lento                    | i18n `notice.slow`                                                                           |
| «Cargando…», solo lectores de pantalla     | i18n `common.loading`                                                                        |

**Qué error ve la persona** (`lib/apiErrors.ts`; el `message` del servidor nunca se muestra):

- `NETWORK_ERROR` (status 0: red, CORS o DNS) → `errors.network`, con «Reintentar».
- `TIMEOUT` (status 0, a los 60 s) → `errors.timeout`, con «Reintentar».
- `INVALID_RESPONSE` (no es el envelope JSON; **conserva el status HTTP**, por ejemplo 502 de Render) y cualquier 5xx → `errors.server`, con «Reintentar».
- 400 → `errors.invalid` (el formulario muestra errores por campo); 404 → página 404; 429 → `form.errors.rateLimited`; 403 y el resto → `errors.generic`.

## Relleno del canvas que no se usa

Los cuatro proyectos de ejemplo, las categorías fijas, el email `[tu@email.com]`, los enlaces `#` de «Ver detalle», GitHub y LinkedIn, y el texto «[Captura del proyecto]».
