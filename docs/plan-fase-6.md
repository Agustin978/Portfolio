# Plan de implementación: Fase 6, sitio público

Este documento es la fuente de verdad de la Fase 6. Si algo de lo que ves en el repositorio contradice este plan, no lo resuelvas por tu cuenta: anotalo en el reporte del Paso 0 y esperá instrucciones.

## 0. Reglas de trabajo

- Plan antes de código. Sin cambios de esquema de base de datos ni de estructura existente sin consentimiento previo del dueño del proyecto (Agustín).
- Cada PR sale de una rama con nombre descriptivo, creada desde `dev` actualizado (`git checkout dev`, `git pull`). Nunca se commitea a `dev` ni a `main`. Nunca `push --force`.
- Commits chicos, cada uno con sus tests. Lint, typecheck, build y tests en verde antes de cada push.
- Si `gh` no está instalado, preparás el título y la descripción de cada PR y Agustín lo abre y lo fusiona en GitHub.
- Al terminar cada PR: resumen corto y freno. No empezás el siguiente hasta que Agustín confirme que el anterior está fusionado en `dev`.
- Instalá solo las dependencias que usa cada PR. Si npm da conflictos de peers, frená y consultá (sin `--force` ni `--legacy-peer-deps`).
- Nunca imprimas valores de `.env` ni secretos: solo nombres de variables.
- Idioma de trabajo: español, trato de vos.

## 1. Paso 0: reconocimiento del estado (solo lectura, obligatorio)

Esta fase puede continuarse desde otra computadora y con otro agente. Antes de cualquier cambio, reanalizá el proyecto y compará con los datos de referencia de la sección 2. No modifiques nada en este paso.

1. **Git y ramas**
   - Rama actual y `git status`.
   - `git fetch --all --prune`, y cuántos commits de adelanto o atraso tiene la rama actual respecto de `origin/dev`.
   - Ramas locales y remotas existentes, y cuáles ya están fusionadas en `dev`.
   - PRs ya fusionados en `dev`: identificalos por los commits de merge (`Merge pull request #N`) y por `git log --merges`. Verificá que estén #1 a #7 y si hay alguno más.
   - Commits en `dev` que no pasaron por PR (por ejemplo `32f207a`, «Instalacion de paquetes»).
   - Contenido de `chore/housekeeping` que no está en `dev`: lista de commits y archivos tocados.
   - Si `gh` está disponible.
2. **Entorno**
   - `node -v` y `npm -v` contra el pin del repositorio (`.nvmrc`, `engines` en `package.json`). Si no coinciden, no ejecutes `npm install`: usá `npm ci` solo si coinciden, y avisá la diferencia. El lockfile no debe cambiar por tu instalación.
   - Nombres (no valores) de las variables presentes en `.env` y `client/.env`, contra `.env.example`. Marcá las que falten (`JWT_SECRET`, `CLOUDINARY_*`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `TEST_DATABASE_URL`).
   - Estado de las bases `portfolio_dev` y `portfolio_test` (migraciones aplicadas) y contenido actual de `portfolio_dev`: cantidad de proyectos, categorías, tecnologías, experiencias, redes, imágenes y datos del perfil (si siguen los de relleno).
3. **Documentación contra realidad**
   - `CLAUDE.md`: reglas, fases, estado actual y fecha de actualización. Marcá lo desactualizado.
   - `docs/api.md` contra los esquemas Zod del servidor (campos de las respuestas públicas, `?lang`, `?category`, códigos de error).
   - `README.md` contra lo que de verdad exige el servidor para arrancar.
4. **Verificación**
   - `npm run lint`, `npm run format:check`, `npm test` y `npm run build`, en ese orden. Anotá resultados y duración.
5. **Cliente actual**
   - Qué hay en `client/src` (router, i18n, apiClient, tokens, Home provisional) y qué falta respecto de este plan.
6. **Diseño**
   - Si existe `docs/design/Portfolio.dc.html` (fuente de un componente de diseño: se lee como referencia de HTML, CSS y textos; no se abre solo en el navegador; referencia un `./support.js` que no está en el repo).

**Entregable del Paso 0:** un reporte corto con (a) lo que coincide con la sección 2, (b) las diferencias, (c) los riesgos, (d) qué PR corresponde empezar según el estado real. Frená y esperá la aprobación de Agustín antes de continuar.

## 2. Datos de referencia (última verificación; pueden haber cambiado)

- Fases 0 a 5 (base, datos, auth, contenido, imágenes, contacto) están hechas y fusionadas en `dev` con los PR #1 a #7.
- `main` solo tiene el commit vacío inicial. No hay nada en producción hasta la Fase 9.
- Servidor: 28 archivos de test, 343 tests en verde. Cliente: sin tests (el script `test` es un `echo`).
- No hay CI (no existe `.github/`).
- Pin de Node: 24.22.1 (LTS, release de seguridad del 21-oct-2026) con npm 11.19.1, el que trae ese Node. Reemplaza al pin anterior 24.14.0 / 11.9.
- `chore/housekeeping` tenía 5 commits fuera de `dev`: pin de Node (`.nvmrc`, `engines`; luego actualizado a 24.22.1), normalización de `CLIENT_ORIGIN` en `env.ts` y CORS con tests, README con tabla de variables y paso `db:generate`, actualización de `CLAUDE.md`, y el archivo de diseño.
- Hay un commit directo a `dev` (`32f207a`) que solo cambia `package-lock.json`.
- `CLAUDE.md` decía «Fase 5 pendiente de PR» aunque el PR #7 ya estaba fusionado.
- Cliente actual: router por idioma (`/es`, `/en`), `RootRedirect`, i18n es/en con textos del placeholder, React Query, `apiClient` (get, post, put, delete; `BASE_URL` fijo `/api/v1`; fuerza `Content-Type: application/json`), tokens de Tailwind y una Home provisional.
- Base `portfolio_dev` (lectura del 2026-11-12, en la computadora que corre `db:seed-demo`): 1 admin, perfil de relleno «Nombre Apellido», 1 categoría, 0 proyectos, 0 imágenes y 2 mensajes de contacto; sin tecnologías, experiencias ni redes.

## 3. Contexto técnico

- Monorepo con npm workspaces: `client/` y `server/`. TypeScript en ambos. Node 24.
- Cliente: React 19, Vite 8, Tailwind 4 (`@tailwindcss/vite`, sin `tailwind.config.js`), react-router 8.5, TanStack Query, i18next y react-i18next.
- Servidor: Express 5, Zod 4, Prisma 7, PostgreSQL. Arquitectura controller → service → repository. REST bajo `/api/v1`.
- Formato de respuesta: `{ success, data, meta }` o `{ success: false, error: { code, message, details } }`.
- Endpoints públicos que consume el sitio. `?lang=es|en` (por defecto `es`; un valor inválido da 400) solo lo usan los que tienen contenido traducible: profile, categorías, proyectos y experiencias. `/skills` y `/social-links` lo ignoran (no se cambia el código; el cliente puede mandarlo igual, sin depender del 400):
  - `GET /profile`
  - `GET /project-categories` (solo categorías con al menos un proyecto publicado y activo)
  - `GET /projects` (con `?category=slug`) y `GET /projects/:slug`
  - `GET /experiences` (actuales primero)
  - `GET /skills` (tecnologías con `show_in_skills`, agrupadas por `skillGroup`; los nombres de tecnologías no se traducen; sin `?lang`)
  - `GET /social-links` (solo visibles; sin `?lang`)
  - `POST /contact` (201 `{ received: true }`; honeypot `hp_check`; 5 envíos por hora por IP; con `Origin` ajeno responde 403)
- Reglas de datos relevantes:
  - Publicar exige ambos idiomas completos.
  - Publicar un proyecto exige portada, por lo que `cover` no es null en la práctica en los proyectos publicados.
  - No hay borrado físico de proyectos, experiencias ni redes (solo desactivar u ocultar).
  - Las fechas llegan como `YYYY-MM-DD`.
  - El servidor es la autoridad de validación.
- El contrato de respuestas está en `docs/api.md`. Ante una diferencia con los esquemas Zod, gana el servidor: documentalo.

## 4. Alcance

**Entra:**

- Home: header con selector ES/EN, hero, proyectos con filtro, sobre mí con skills, experiencia, contacto con formulario, redes con íconos y footer.
- Detalle de proyecto, página 404 y estados de datos (carga, error, vacío, servidor lento).
- Tests del cliente y contenido de desarrollo (seed demo).

**No entra:**

- Panel y login (Fase 7), SEO fino, prerender, Lighthouse y auditoría de accesibilidad completa (Fase 8), `_redirects`, CSP, dominios y cookies de producción (Fase 9).
- Modo oscuro, lightbox, Markdown, foto de perfil y logos (no hay columnas), imágenes de experiencias (el dato queda disponible en la API).

## 5. Decisiones cerradas

1. Experiencia es una sección propia, después de «Sobre mí», con su enlace en el menú. Orden de la página y del menú: Proyectos, Sobre mí, Experiencia, Contacto.
2. Logo y footer usan `fullName` completo.
3. «Estoy abierto a…» sale de `availability`, con respaldo i18n `contact.lead`.
4. El filtro de categorías se hace en el cliente, sobre un solo request a `/projects`, y vive en la URL (`?category=slug`). Un slug inexistente o sin proyectos se trata como «Todos».
5. El detalle vive en `/:lang/projects/:slug` (mismo segmento en ambos idiomas).
6. No se muestran imágenes de experiencias.
7. Tests con Vitest, jsdom y Testing Library, sin `msw` (helper propio `tests/helpers/mockApi.ts` que simula `fetch`).
8. Íconos de redes como SVG propios, sin librería.
9. `VITE_API_URL` (solo el origen) entra en esta fase, en `client/.env.example`.
10. Contenido de desarrollo mediante un script `db:seed-demo` en el servidor (sección 13).
11. Formulario con campos oscuros dentro del panel oscuro.
12. El acento queda fijo en `#0F766E`: no se implementa la prop de acento del canvas.

## 6. Diseño

**Fuente:** `docs/design/Portfolio.dc.html` (escritorio; el sitio es una sola página fluida que se adapta a tablet y teléfono).

**Tokens existentes:** fondo `#FAFAF9`, texto `#18181B`, secundario `#52525B`, bordes `#E4E4E7`, acento `#0F766E`. Fuentes Geist (400, 500, 600) y Geist Mono (400, 500); se quita el peso 700 de `index.html`, que el diseño no usa. Contenedor de 1040 px. Tarjetas con radio de 16 px. Botones tipo píldora. Objetivos táctiles de 44 px como mínimo.

**Tokens nuevos** (en `styles/tokens.css`):

| Token           | Valor                                        | Uso                                                                                                                                 |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `surface`       | `#FFFFFF`                                    | tarjetas                                                                                                                            |
| `subtle`        | `#F4F4F5`                                    | fondos suaves, chips                                                                                                                |
| `border-strong` | `#D4D4D8`                                    | bordes de botones y chips                                                                                                           |
| `border-hover`  | `#A1A1AA`                                    | hover de tarjetas y chips                                                                                                           |
| `fg-soft`       | `#3F3F46`                                    | texto de chips                                                                                                                      |
| `ink`           | `#27272A`                                    | fondo de campos en el panel oscuro y hover de botón fantasma                                                                        |
| `border-field`  | `#71717A`                                    | borde de campos en el panel oscuro (≈3,7:1 sobre `#18181B`; `#52525B` da ≈2,3:1 y no alcanza el 3:1 exigido a los bordes de campos) |
| `radius-panel`  | `24px`                                       | panel de contacto                                                                                                                   |
| `focus-ring`    | `#18181B`; `#FAFAF9` dentro del panel oscuro | anillo de foco (el canvas usa `#18181B` también sobre el panel oscuro, donde no se vería)                                           |

**Contraste:** medir de nuevo al implementar (referencia: acento sobre `#FAFAF9` ≈ 5,2:1; secundario ≈ 7,4:1, ambos AA).

**Header**

- Izquierda: punto de acento y `fullName`. Derecha: menú y selector de idioma.
- Selector: control segmentado en forma de píldora, dos **enlaces** (no botones) con `lang="en"` / `lang="es"` y `aria-current` en el activo. El activo va relleno `#18181B` con texto `#FAFAF9`; el otro con borde `border-strong`. Cada opción de 44 px de alto. Conservan la ruta y el hash.
- En teléfono, el menú pasa a una segunda fila.

**Hero:** eyebrow (`role · location`, omite el que sea null), `h1` con `headline`, bajada con `intro`, botones «Ver proyectos» y «Contacto», y «Descargar CV» solo si `cvUrl` no es null.

**Proyectos:** título, chips de filtro («Todos» más las categorías de la API; `aria-pressed`) y grilla de tarjetas (portada 16:9, categoría en mono con color de acento, título, resumen, chips de tecnologías y enlace «Ver detalle» extendido a toda la tarjeta con nombre accesible único «Ver detalle: {título}»). Si falta la portada (no debería ocurrir), bloque gris `aria-hidden`.

**Sobre mí:** `h2` a la izquierda; a la derecha, biografía (párrafos separados por línea en blanco; el primero en color fuerte y los demás en secundario) y skills como lista de definición agrupada (grupo en mono mayúsculas, tecnologías separadas por «·»).

**Experiencia** (reutiliza el layout de dos columnas de «Sobre mí» y las filas de skills):

```
ENE 2022 — ACTUALIDAD    | Rol                                  (h3, 22 px)
(mono, mayúsculas, 140px)| Empresa (enlace si hay companyUrl) · Lugar
                         | Descripción en párrafos, color secundario
                         | [chip] [chip]                        (mono 12 px, fondo subtle)
```

Fechas con `Intl.DateTimeFormat` según el idioma, con `timeZone: 'UTC'` (con `new Date()` común, en Argentina podrían mostrar el día anterior) y `<time datetime>`. `endDate` null muestra «Actualidad» / «Present».

**Contacto:** panel oscuro `#18181B`, radio 24 px. Desde 1024 px lleva dos columnas; debajo, una.

```
+ panel #18181B, radio 24 ------------------------------------------+
| Trabajemos juntos.               | Nombre   [___________________]  |
| <availability o contact.lead>    | Email    [___________________]  |
| [correo] [GitHub] [LinkedIn]     | Mensaje  [___________________]  |
|                                  |          [___________________]  |
|                                  | 0/5000        [ Enviar mensaje ] |
+--------------------------------------------------------------------+
```

- Campos: fondo `ink`, borde `border-field`, texto `#FAFAF9`. Etiquetas siempre visibles (no solo placeholder). Foco con `focus-ring` claro. Botón «Enviar» como `btn-light` del diseño.
- Botones de correo (`publicEmail`, `mailto:`, oculto si es null) y de redes: píldoras con ícono SVG de 16 px decorativo antes del texto. Etiqueta i18n `social.<platform>` con respaldo al nombre capitalizado. Íconos: GitHub, LinkedIn, X, Instagram, YouTube, GitLab y uno genérico para plataformas desconocidas.

**Detalle de proyecto** (`/:lang/projects/:slug`):

```
<- Proyectos                         (vuelve con el filtro; ver sección 7)
WEB                                  (mono, acento)
Título del proyecto                  (h1, mismo clamp que los h2)
Resumen                              (lead, secundario)
Mar 2024 — Actualidad     [Ver sitio ↗] [Ver código ↗]   (solo los que existen)
[ portada 16:9, radio 16, borde ]
[mini][mini][mini]                   (galería; solo si hay más de una imagen)
Descripción en párrafos
Tecnologías: [chip] [chip]
```

Una miniatura cambia la imagen principal (grupo de botones con `aria-current`, sin lightbox). Los enlaces externos llevan `rel="noopener noreferrer"` y texto oculto «(se abre en otra pestaña)».

**Footer:** «© {año} {fullName} · {location}» y «Volver arriba» (la flecha va en un `span aria-hidden`).

**404:** `h1` traducido y enlace de vuelta. También sirve para `PROJECT_NOT_FOUND`, con mensaje específico.

**Estados de datos**

- Carga: skeletons con la forma final (tarjeta 16:9 con tres líneas y chips; filas de skills; entradas de experiencia), tono `subtle` a `border`, con pulso solo bajo `motion-safe`.
- Error por sección: tarjeta con borde, texto y botón píldora «Reintentar». Una sección caída no rompe las demás.
- Vacío: proyectos muestra un mensaje («Todavía no hay proyectos publicados»). Experiencia, skills y redes se ocultan, incluido su enlace del menú.

## 7. Rutas e idioma

- `/` redirige según `navigator.languages` (el primero soportado; si no hay ninguno, `es`).
- `/:lang` es la Home; `/:lang/projects/:slug` es el detalle. Una ruta desconocida bajo un idioma válido muestra la 404 traducida. Un primer segmento que no sea `es` o `en` redirige al idioma detectado.
- Detección de i18n en `['path', 'navigator']` y el idioma se fija antes del primer render (hoy se cambia en un `useEffect`, y un enlace directo a `/en` pinta un instante en español). El idioma de los datos sale siempre de la URL, no del estado de i18n. `lang` en `<html>`.
- Cada sección renderiza su `<section id>` de inmediato, aunque esté cargando, para que `<ScrollRestoration />` de react-router resuelva los hashes (`/es#contacto`) y la posición al volver del detalle. Desde el detalle, el enlace «← Proyectos» vuelve con el filtro: retrocede en el historial si hay uno interno; si no, navega a `/:lang?category=...#proyectos`.
- `<title>` por ruta con el elemento nativo de React 19: `meta.title` más `fullName`.

## 8. Cliente de API y errores

**Variable:** `VITE_API_URL` es solo el origen (por ejemplo `https://api.ejemplo.com`); el código agrega `/api/v1`. Vacío significa relativo, y sirve con el proxy de Vite en desarrollo. Va sin valores en `client/.env.example`; el valor real, en `client/.env` (ignorado por git).

**Cambios en `apiClient`**

- `Content-Type` solo cuando hay body (hoy se envía también en los GET, y entre dominios eso obliga a un preflight `OPTIONS` antes de cada GET; además deja listo el `FormData` de la Fase 7).
- `credentials` pasa a ser opción por llamada; el sitio público no usa cookies.
- Respeta la `AbortSignal` de TanStack Query y agrega un tope de 60 s.
- Red caída, timeout y cuerpo que no es JSON (por ejemplo el 502 de Render) se vuelven `ApiError` con `status` 0 y `code` `NETWORK_ERROR` o `TIMEOUT` (o el código correspondiente).
- Capa `services/*.service.ts` que desenvuelve `data`. Los hooks de TanStack Query incluyen el idioma en la clave (`['projects', lang]`).
- Defaults de Query: `staleTime` 5 min, sin refetch al enfocar la ventana, mutaciones sin reintento.
- `patch` y multipart quedan para la Fase 7.

**Reintentos:** solo en GET, solo para red caída y 502, 503 o 504, máximo 2 veces (1 s y 2 s). Un timeout **no** se reintenta solo: la sección muestra el error con «Reintentar». POST nunca se reintenta.

| Situación              | Qué ve la persona                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Red, CORS o DNS        | `errors.network`                                                                                                              |
| Timeout (60 s)         | `errors.timeout` y «Reintentar»                                                                                               |
| 400 `VALIDATION_ERROR` | En el formulario, error por campo con mensaje propio traducido (`details` solo dice qué campo falló); si no, `errors.invalid` |
| 404                    | Página 404                                                                                                                    |
| 429 `RATE_LIMITED`     | `form.errors.rateLimited`, genérico y sin cuenta regresiva                                                                    |
| 5xx o cuerpo no JSON   | `errors.server` y «Reintentar»                                                                                                |
| 403 `FORBIDDEN_ORIGIN` | `errors.generic` (es un problema de configuración)                                                                            |

El `message` del servidor está en inglés y nunca se muestra.

**Servidor lento (Render dormido):** un solo `SlowResponseNotice` en el layout, con `role="status"`, usa `useIsFetching()`. Si algo sigue cargando pasados 4 s, muestra «El servidor está iniciando; puede tardar hasta un minuto.» («The server is starting up; this may take up to a minute.»). Desaparece cuando todo se resuelve. Los skeletons siguen visibles todo el tiempo. Pasados los 60 s, cada sección cae a su estado de error con «Reintentar». El texto no menciona el hosting gratuito.

## 9. Imágenes

Helper `lib/imageUrl.ts`:

- Inserta `f_auto,q_auto,w_<n>` después de `/upload/` con anchos fijos 400, 800, 1200 y 1920 (cada variante nueva consume créditos de la cuota gratuita la primera vez que se genera).
- Solo usa anchos menores o iguales al `width` de la imagen. Si la imagen es menor que 400, usa la URL tal cual. Si la URL no es de Cloudinary o no tiene `/upload/`, la deja intacta.

| Uso                 | `sizes`                                        | Carga                                        |
| ------------------- | ---------------------------------------------- | -------------------------------------------- |
| Tarjeta             | `(min-width: 800px) 460px, calc(100vw - 40px)` | `loading="lazy"`, `decoding="async"`         |
| Portada del detalle | `(min-width: 1040px) 944px, 100vw`             | `eager` y `fetchpriority="high"` (es el LCP) |
| Miniaturas          | `160px`                                        | lazy                                         |

Ajustar los `sizes` con las herramientas del navegador al implementar. Siempre `width` y `height` de la API más `aspect-ratio` en el contenedor, para evitar saltos de layout. `alt` de la API o, si es null, el título del proyecto.

## 10. Formulario de contacto

- `react-hook-form` con `zodResolver`, modo `onTouched` y foco automático al primer error.
- Esquema Zod espejo del servidor (`contact.schemas.ts`), solo para experiencia de usuario: `name` 1–100 en una sola línea y sin caracteres de control; `email` hasta 254; `message` 10–5000 sin NUL; todos con `trim`; los mensajes son claves i18n. Un test fija los límites y un comentario apunta al archivo del servidor.
- Honeypot `hp_check`: el markup exacto de `docs/api.md` (`autocomplete="off"`, `tabindex="-1"`, `aria-hidden="true"`, contenedor `aria-hidden`, fuera de pantalla con CSS; sin `display:none` ni `type="hidden"`). Se envía siempre, vacío si no se tocó.
- Payload: `{ name, email, message, lang, hp_check }`, con `lang` tomado de la URL.
- Envío: botón deshabilitado y «Enviando…» mientras corre; no hay doble envío. Si falla, el formulario conserva lo escrito.
- Éxito: el 201 no garantiza que el correo salió, así que el texto dice «Recibí tu mensaje» y no promete respuesta. Foco en el encabezado de confirmación (`role="status"`) y botón «Enviar otro mensaje».
- Fallos de red, timeout y 5xx ofrecen reintentar y, si existe `publicEmail`, el `mailto:` como alternativa. En 429 el texto es genérico.
- No se loguean ni se guardan los valores del formulario.

## 11. Accesibilidad y semántica

- Landmarks `header`, `nav` con etiqueta, `main` y `footer`. Enlace «Saltar al contenido», visible al enfocar.
- Un solo `h1` por pantalla, `h2` por sección y `h3` en tarjetas y puestos.
- Skills como `<dl>` (grupo y lista). Filtro como botones con `aria-pressed`.
- Objetivos táctiles de 44 px como mínimo, foco visible y `prefers-reduced-motion` respetado.
- Mensajes de carga con `role="status"`. Errores del formulario con `aria-invalid` y `aria-describedby`.
- `lang` en `<html>` y en el selector de idioma. Enlaces externos con aviso de pestaña nueva solo para lectores de pantalla.

## 12. Seguridad del contenido

- Todo lo que viene de la API se renderiza como texto: nunca `dangerouslySetInnerHTML`. Registrarlo como regla en `CLAUDE.md`.
- Los enlaces externos pasan por `safeUrl` y solo se renderizan URLs `http` o `https`; llevan `rel="noopener noreferrer"`. El `mailto:` se arma solo con `publicEmail`.

## 13. Contenido de desarrollo: `db:seed-demo`

Script en el servidor (`server/`) para tener contenido realista en `portfolio_dev` mientras no exista el panel.

- Se corre en una sola computadora (la que tiene la base descrita en la sección 2): las dos comparten la carpeta `portfolio/development` de Cloudinary, pero no la base, así que correrlo en ambas dejaría archivos que ninguna base conoce.

- Pasa por los services y respeta las invariantes: publicado implica ambos idiomas y portada.
- Las portadas se generan con `sharp` como imágenes de relleno y se suben a través de `ImageStorage` a `portfolio/development`. Sin Cloudinary configurado, los proyectos quedan en borrador y el script avisa.
- Se niega a correr si `NODE_ENV` es `production` o si el nombre de la base no termina en `_dev`.
- Idempotente por slug; no vuelve a subir imágenes. No pisa un perfil que ya tenga datos reales (solo reemplaza valores de relleno).
- Contenido base: el del canvas (proyectos RUCVM, sistema comercial SaaS, clasificación de radiografías de tórax y laboratorios de redes; categorías Web, IA y Redes; tecnologías por grupo; perfil con titular, bajada y bio del diseño; disponibilidad; una experiencia del Ministerio de Desarrollo Social de Tucumán, más una experiencia claramente ficticia para probar orden y lista; redes GitHub y LinkedIn con URLs de ejemplo). Todo con traducción al inglés.
- **Antes de escribir el script, mostrá el contenido completo (español e inglés) a Agustín para que lo revise.**
- Tests: el guard de producción y de nombre de base, y la idempotencia.
- Las capturas y datos reales los carga Agustín por API o, desde la Fase 7, por el panel.

## 14. Tests del cliente

Vitest con jsdom y Testing Library. Sin red, sin base de datos y sin Cloudinary.

| Capa           | Qué cubre                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitarios      | `imageUrl` (anchos, sin agrandar, URL ajena), párrafos, fechas (UTC), `safeUrl`, mapeo error → clave i18n, esquema del formulario en sus límites                                 |
| `apiClient`    | URL base, desenvuelto del envelope, 400 con `details`, 429, 5xx con cuerpo no JSON, red caída, timeout, `Content-Type` solo con body, política de reintentos                     |
| Rutas e idioma | Redirect de `/` (es-AR→es, en-US→en, ['fr','en']→en, fr→es), idioma inválido, 404, selector que conserva ruta y hash                                                             |
| Componentes    | Filtro (`aria-pressed`, `?category=`, slug inexistente, estado vacío), carga → contenido → error → reintentar, aviso de lentitud con timers falsos, secciones opcionales ocultas |
| Formulario     | Validación en es y en, honeypot presente y vacío, payload exacto, no doble envío, éxito, 429, 5xx y red, valores conservados                                                     |
| Paridad i18n   | `es.json` y `en.json` con el mismo conjunto de claves                                                                                                                            |

Más `npm run lint` y `npm run build` limpios. Axe y Lighthouse quedan para la Fase 8.

## 15. Dependencias (solo lo que usa cada PR)

- Runtime: `react-hook-form`, `@hookform/resolvers` y `zod` (misma versión mayor que el servidor).
- Dev: `vitest` (misma versión mayor que el servidor), `jsdom`, `@testing-library/react`, `@testing-library/dom` (peer obligatorio), `@testing-library/user-event` y `@testing-library/jest-dom`.
- Elegí las versiones vigentes compatibles con React 19, Vite 8 y Zod 4, verificándolas en npm al momento de instalar. Si el bundle lo pide, el formulario puede cargarse con `React.lazy`; medirlo al final con `vite build`.

## 16. Estructura de archivos

Existentes que se modifican: `services/apiClient.ts`, `app/Providers.tsx` (defaults de Query), `app/router.tsx`, `app/LanguageLayout.tsx` (header, footer, 404, `ScrollRestoration`, idioma antes del primer render), `features/home/Home.tsx` (sale la versión provisional), `i18n/index.ts`, `es.json`, `en.json`, `styles/tokens.css`, `index.html` y `client/package.json`.

Nuevos:

```
client/src/
  config/env.ts
  services/{profile,projects,categories,experiences,skills,socialLinks,contact}.service.ts
  lib/{imageUrl,paragraphs,dates,safeUrl,apiErrors}.ts
  components/ui/   (PillLink, Chip, Skeleton, SectionHeading, ErrorBlock, EmptyBlock, ResponsiveImage, SocialIcon)
  features/{layout,hero,projects,experience,about,contact,errors}/   (contenedor con hook + componentes presentacionales)
client/tests/helpers/
client/.env.example
docs/design/content-map.md
docs/plan-fase-6.md   (entra en el PR 1)
```

## 17. Mapa de contenido: de dónde sale cada texto

Se guarda también como `docs/design/content-map.md`.

| Texto del diseño                                                            | Fuente                                                                            |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Logo «Agustín»                                                              | `/profile` → `fullName`                                                           |
| Menú Proyectos / Sobre mí / Experiencia / Contacto y etiqueta de navegación | i18n `nav.projects`, `nav.about`, `nav.experience`, `nav.contact`, `nav.label`    |
| «Desarrollador · San Miguel de Tucumán»                                     | `/profile` → `role` · `location` (omite el que sea null)                          |
| H1 del hero                                                                 | `/profile` → `headline`                                                           |
| Párrafo «Soy Agustín…»                                                      | `/profile` → `intro`                                                              |
| «Ver proyectos», «Contacto»                                                 | i18n `hero.projects`, `hero.contact`                                              |
| «Descargar CV» (nuevo)                                                      | i18n `hero.cv` y `/profile` → `cvUrl` (solo si no es null)                        |
| «Proyectos», etiqueta del filtro, «Todos»                                   | i18n `projects.title`, `projects.filterLabel`, `projects.all`                     |
| Chips Web / IA / Redes                                                      | `/project-categories` → `name` (el slug filtra)                                   |
| Imagen de la tarjeta                                                        | `/projects` → `cover`                                                             |
| Categoría, título y descripción de la tarjeta                               | `category.name`, `title`, `summary` (la `description` larga va en el detalle)     |
| Stack de la tarjeta                                                         | `technologies[].name`                                                             |
| «Ver detalle»                                                               | i18n `projects.detail`                                                            |
| «Sobre mí»                                                                  | i18n `about.title`                                                                |
| Dos párrafos de bio                                                         | `/profile` → `bio`                                                                |
| «Desarrollo / Datos / Infraestructura»                                      | `/skills` → `group`, traducido con i18n `skills.groups.<group>` (incluye `other`) |
| «Laravel · Livewire · …»                                                    | `/skills` → `technologies[].name`                                                 |
| «Trabajemos juntos.»                                                        | i18n `contact.title`                                                              |
| «Estoy abierto a oportunidades…»                                            | `/profile` → `availability`; respaldo i18n `contact.lead`                         |
| Botón de correo                                                             | `/profile` → `publicEmail` (`mailto:`, oculto si es null)                         |
| GitHub / LinkedIn                                                           | `/social-links` → `platform` y `url`; etiqueta i18n `social.<platform>`           |
| «© 2026 Agustín · San Miguel de Tucumán, Argentina»                         | © + año calculado + `fullName` + `location`                                       |
| «Volver arriba»                                                             | i18n `footer.top`                                                                 |
| `<title>`                                                                   | i18n `meta.title` + `fullName`                                                    |
| Mensajes de error, formulario y aviso de lentitud                           | i18n `errors.*`, `form.*`, `notice.*`                                             |

Se descartan como relleno: los cuatro proyectos de ejemplo del canvas, las categorías fijas, el email entre corchetes y los enlaces `#` de «Ver detalle», GitHub y LinkedIn.

## 18. PRs y commits

Seis PRs. Cada uno sale de `dev` actualizado, lleva sus tests y se aprueba por separado.

1. **`chore/housekeeping`** (existente). Pin de Node 24.22.1 y npm 11.19.1 con el lockfile regenerado, normalización de `CLIENT_ORIGIN` con tests, README con las variables obligatorias, fnm y `npm ci`, actualización de `CLAUDE.md` (estado real de la Fase 5), `docs/design` en `.prettierignore` (el canvas no se reformatea porque tiene sintaxis propia) y este plan.
   - Las dos computadoras ya están en Node 24.22.1, así que no hace falta la alternativa de mover el diseño al PR 3.
2. **`feature/dev-demo-content`.** Script `db:seed-demo` (sección 13), sus tests y la documentación.
3. **`feature/client-foundation`.** Commits: `docs: content-map` · `chore: script typecheck en la raíz` (`npm run typecheck --workspaces --if-present`, con su script en cada workspace) · `chore(client): Vitest y Testing Library` (reemplaza el `echo` del script `test` del cliente) · `feat(client): apiClient, env y defaults de Query` · `feat(client): services y hooks de datos` · `feat(client): tokens, componentes UI y helpers (imageUrl, fechas, safeUrl, párrafos, errores)` · `feat(client): estructura de i18n con test de paridad`.
4. **`feature/site-home`.** Layout con header, selector de idioma, footer, skip link, `ScrollRestoration`, 404 y aviso de lentitud; hero; sobre mí con skills y redes; proyectos con filtro y tarjetas.
5. **`feature/site-project-detail-experience`.** Página de detalle con galería y sección de experiencia.
6. **`feature/site-contact`.** Formulario con honeypot, estados e íconos de redes; pasada de estados y responsive; actualización de `CLAUDE.md` y README; cierre de la fase.

## 19. Node y npm entre computadoras

- La versión se fija por **Node**, no por npm: cada Node trae su npm. Pin actual: Node 24.22.1 con npm 11.19.1. `.nvmrc` = `24.22.1`; `engines.node` = `>=24.22.1 <25`; `engines.npm` = `>=11.19.1` (solo mínimo, sin tope); sin `engine-strict`. Ambas computadoras usan `fnm`; npm no se actualiza por separado ni se instala global.
- En una computadora recién configurada, instalar con `npm ci` (no modifica el lockfile).
- Si hay que regenerar `package-lock.json`, va en un commit aparte, con la versión fijada, y se muestra un resumen del diff.
- Mientras las versiones no estén alineadas, no se hacen commits desde la computadora que no coincide con el pin.
- Los despliegues de la Fase 9 fijan `NODE_VERSION` en Render y Cloudflare Pages.

## 20. Cierre de la fase

- `lint`, `typecheck`, `build`, tests y `format:check` en verde.
- Prueba manual contra la API real, en es y en, a 360, 768 y 1280 px, solo con teclado. Estados cubiertos: API caída, 404 de proyecto y 429 del formulario. Una pasada rápida con lector de pantalla.
- `CLAUDE.md` actualizado (estado de la Fase 6, reglas nuevas, pin de Node). Resumen final y freno.

## 21. Riesgos y avisos

- **Rate limit del contacto:** 5 envíos por hora por IP; en pruebas manuales el sexto da 429, y reiniciar el servidor lo resetea (el contador está en memoria; en Render se reinicia con cada deploy o al dormirse la instancia).
- **Origen exacto:** el navegador debe entrar por `http://localhost:5173`; con `127.0.0.1` el POST responde 403 `FORBIDDEN_ORIGIN`.
- **`cover` nulo:** se tipa como nullable aunque en la práctica no lo sea, y el cliente lo tolera.
- **Una falla de envío por timeout puede ser un correo que sí salió;** el tope diario de 50 correos es un freno blando (documentado en `CLAUDE.md`).
- **Render dormido:** el primer visitante puede esperar hasta un minuto (aviso de lentitud en la Fase 6; evaluar un ping periódico en la Fase 9).
- **Scripts de instalación salteados:** npm 11.19.1 no ejecuta los scripts de instalación que no estén aprobados (`@prisma/engines`, `argon2`, `esbuild`, `prisma`). En local, lint, tests, build y Prisma funcionan sin ellos. El build de Render y Cloudflare Pages no debe depender de ningún postinstall: hay que verificarlo en el primer deploy (Fase 9). No se aprueban sin consultar.

## 22. Fuera de esta fase (para las siguientes)

- Fase 7: `patch` y multipart en `apiClient`, reordenamiento atómico de imágenes, panel.
- Fase 8: SEO, prerender, autoalojar las fuentes Geist, auditoría de accesibilidad y Lighthouse, workflow de CI (lint, typecheck y tests con Postgres en cada PR) en una rama `chore/ci`.
- Fase 9: `BASE_URL` y cookies entre dominios (`SameSite=None` y Safari), dominio propio de Resend, `_redirects` y CSP, `NODE_VERSION` (24.22.1) y ping de mantenimiento. Verificar en el primer deploy que el build no dependa de los scripts de instalación que npm 11.19.1 saltea (sección 21).
