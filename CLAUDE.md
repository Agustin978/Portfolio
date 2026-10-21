# Portfolio personal

Sitio público bilingüe (es/en) con proyectos y experiencia laboral, formulario de contacto, iconos de redes y panel de administración privado. Todo sobre servicios gratuitos. Trabajo por fases; ver la lista al final.

## Stack (versiones fijadas, no cambiar)

- Monorepo con npm workspaces: `client/` y `server/`. TypeScript 6 (`typescript@6`, NO la 7: typescript-eslint no la soporta todavía).
- Cliente: React 19, Vite 8, Tailwind CSS 4 con `@tailwindcss/vite` (sin `tailwind.config.js`), `react-router` 8 (paquete `react-router`, no `react-router-dom`), `@tanstack/react-query`, i18next + react-i18next + i18next-browser-languagedetector, react-hook-form + @hookform/resolvers + zod.
- Servidor: Express 5, Zod 4, Prisma línea 7 (`prisma@7`, `@prisma/client@7`, `@prisma/adapter-pg@7`, `pg`; NO Prisma 8), argon2, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit, multer, sharp, cloudinary, resend, dotenv.
- Herramientas: Vitest + supertest, ESLint + typescript-eslint, Prettier, tsx, concurrently.
- Producción (gratis): Cloudflare Pages (cliente), Render (API), Neon (PostgreSQL), Cloudinary (imágenes), Resend (email).
- Se instala por fase solo lo que esa fase usa. Si npm da conflictos de dependencias: no usar `--force` ni `--legacy-peer-deps`; frenar y consultar.

## Entorno

Windows + PowerShell, Node 24 LTS, PostgreSQL 17 local (bases `portfolio_dev` y `portfolio_test`). Todo debe funcionar en Windows.

## Ramas

- `main` = producción (lo que llega a main se despliega). `dev` = pruebas e integración. No hay entorno de test desplegado: se prueba en local y en `dev`.
- Cada tarea va en su propia rama creada desde `dev`, en kebab-case (`feature/admin-login`, `fix/contact-form-validation`).
- Flujo: rama de tarea -> `dev` -> `main`, siempre por pull request que aprueba el dueño. Nunca commit ni push directo a `main` ni a `dev` (única excepción: el commit inicial vacío de `main`).
- Commits chicos, con mensajes que expliquen el porqué.

## Reglas de trabajo

- Plan antes de código. Pedir confirmación antes de tocar esquemas de base de datos o la estructura de código existente.
- Prisma (esquema, migraciones, seed): mostrar el esquema propuesto y esperar aprobación.
- Nunca secretos en código ni en el repo. Solo en `.env`; `.env.example` lleva los nombres sin valores.

## Arquitectura

**Servidor** (`server/src/modules/<modulo>/`): Controller (solo HTTP) -> Service (reglas de negocio) -> Repository (único que habla con la base vía Prisma). Sin SQL ni lógica de negocio en controllers. Errores en el middleware central con `AppError`. Validación con Zod en el borde.

**API**: REST bajo `/api/v1`, rutas en kebab-case. Éxito `{ success: true, data, meta }`; error `{ success: false, error: { code, message, details } }`. Los endpoints públicos devuelven solo contenido publicado, traducido según `?lang=es|en`.

**Cliente**: componentes presentacionales que no hacen fetch; los datos llegan por hooks con TanStack Query y una capa `services/` con `apiClient`. Mobile-first. El idioma va en la URL (`/es`, `/en`); los textos de interfaz viven en `src/i18n/es.json` y `en.json`.

**Seguridad**: un único admin creado por seed, sin endpoint de registro; JWT de corta duración en cookie httpOnly; rate limit en login y contacto; helmet.

**Autenticación** (Fase 2, hecho): `server/src/modules/auth/`. `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; `requireAuth` protege las rutas del panel (se importa de `auth.middleware.ts` y se cablea en `app.ts`).
- JWT HS256 con solo `sub` (más `iat`/`exp`), en cookie `session`. Duración: `JWT_EXPIRES_IN_SECONDS` (8 h por defecto), usada para el `exp` y el `maxAge`. Sin refresh token.
- `requireAuth` relee al admin por id en cada request y rechaza el token si el admin no existe o si `iat` es anterior a `admin_users.updated_at`. Re-correr el seed con otra `ADMIN_PASSWORD` rota la contraseña y cierra las sesiones viejas.
- Login: mismo error `INVALID_CREDENTIALS` para email inexistente y contraseña errónea, con una verificación argon2 contra un hash falso (mismos parámetros, `shared/security/password.ts`). El email se normaliza (trim y minúsculas) en login y seed. Límites: email 254, contraseña 256.
- Rate limit: 5 intentos fallidos cada 15 min por IP (`skipSuccessfulRequests`), con `createRateLimiter` (reutilizable en contacto). `trust proxy` = 1, nunca `true`.
- Guardia de origen: POST/PUT/PATCH/DELETE con `Origin` distinto de `CLIENT_ORIGIN` responden 403 `FORBIDDEN_ORIGIN`; sin `Origin` se permite. `Cache-Control: no-store` en `/auth/*`. No registrar body ni cookies.
- **Riesgo para la Fase 9**: con el cliente (Cloudflare Pages) y la API (Render) en dominios distintos, la cookie debe ser `SameSite=None; Secure`, y Safari bloquea las cookies entre sitios. Hoy es `SameSite=Lax` (`auth.cookie.ts`). La decisión (dominio propio bajo el mismo sitio, proxy, etc.) se toma en esa fase.

**Datos** (Fase 1, hecho): esquema en `server/prisma/schema.prisma`, 13 tablas — admin_users, profile, project_categories, projects, experiences, technologies, project_technologies, experience_technologies, images, project_images, experience_images, social_links, contact_messages. Todo texto visible lleva columnas `_es` y `_en` (nombres de tecnologías y empresas: una sola columna). Publicar exige ambos idiomas completos y no vacíos (CHECK en la base). Los CHECK, el singleton de `profile` y el índice parcial de portada están escritos a mano al final de la migración init: Prisma no los modela, así que revisar siempre el SQL de cada migración nueva (la prueba de la Fase 1 confirmó que Prisma no los elimina).

- **Desactivación lógica**: `projects` y `experiences` no se borran nunca; tienen `deactivated_at` (independiente de `status`). El service expone solo `deactivate` y `reactivate`. El repository aplica `deactivated_at IS NULL` en toda lectura pública y en el listado por defecto del panel. El slug es único incluyendo desactivados.
- **Borrado real**: solo `contact_messages`. Categorías y tecnologías únicamente si no están en uso (RESTRICT, contando proyectos desactivados).
- **Imágenes (se implementa en la Fase 4)**: una imagen se elimina solo al quitarla de un proyecto o experiencia. El service, en una transacción, borra el vínculo y la fila de `images` si queda sin vínculos; después, fuera de la transacción, borra el archivo en Cloudinary. Si Cloudinary falla, se registra el error y no se revierte nada.
- **API de contenido (Fase 3)**: no existe DELETE de proyectos ni experiencias; son `PATCH .../deactivate` y `PATCH .../reactivate`.
- **Contrato de la API**: ejemplos de cada endpoint en `docs/api.md` (actualizarlo en cada fase). Públicos en `/api/v1/...` con `?lang`; privados bajo `/api/v1/admin/...`, montados en `adminMounts` de `app.ts`: `createAdminRouter` aplica `requireAuth` y `no-store` una sola vez, y un test recorre todas las rutas de `/admin` verificando el 401. Los públicos usan `select` explícito (lista blanca) en el repository. Los PATCH son parciales con `z.strictObject`. Los errores de restricción de la base se traducen con `guarded` (`shared/db/guarded.ts`) en el repository: P2002 a 409, P2003 a 409 (borrar en uso) o 422 (referencia inexistente al escribir), P2025 a 404; nunca 500.
- Redes sociales: sin borrado físico, se ocultan con `isVisible`.
- Proyectos y experiencias: el service valida el estado resultante de cada PATCH (publicado exige ambos idiomas: `422 INCOMPLETE_TRANSLATION` con los campos que faltan). El slug de un proyecto queda bloqueado (`409 SLUG_LOCKED`) tras su primera publicación. Editar nunca reactiva algo desactivado. `technologyIds` (omitido = sin cambio, `[]` = vaciar) se aplica en una transacción; las tablas intermedias no tienen `sort_order`.
- Los mensajes de contacto se guardan primero y el email se envía después (`email_status`).
- Tests de base: usan `TEST_DATABASE_URL` (el nombre debe terminar en `_test`; los tests vacían las tablas).

## Convenciones

- Componentes y clases: PascalCase. Hooks y utilidades: camelCase. Tablas: snake_case plural. Columnas: snake_case.
- Archivos de módulo del servidor: `<modulo>.controller.ts`, `.service.ts`, `.repository.ts`, `.routes.ts` y, si hay body que validar, `.schemas.ts` (Zod). Imports relativos con extensión `.js` (NodeNext).
- Comentarios solo para el porqué, no el qué.

## Diseño

Si existe `docs/design/`, leerlo primero. Tokens en `client/src/styles/tokens.css`: fondo #FAFAF9, texto #18181B, secundario #52525B, bordes #E4E4E7, acento #0F766E, fuentes Geist / Geist Mono, contenedor 1040px, tarjetas radio 16px, botones tipo pastilla. Secciones: header, hero, proyectos con filtro por categoría, sobre mí con skills por grupo, contacto, footer. Selector ES/EN, detalle de proyecto, experiencia, formulario de contacto e iconos de redes: proponer diseño coherente cuando lleguen sus fases.

## Comandos

```powershell
npm install        # instala ambos workspaces
npm run dev        # cliente (5173) y servidor (4000) juntos
npm run lint       # ESLint
npm run format     # Prettier (escribe)
npm test           # Vitest en los workspaces
npm run build      # build de ambos
npm run db:migrate -w server   # crea/aplica migraciones en portfolio_dev
npm run db:seed -w server      # admin + profile iniciales
npm run db:generate -w server  # regenera el cliente Prisma (src/generated, ignorado por git)
```

## Fases

0 base del monorepo · 1 datos · 2 autenticación · 3 API de contenido · 4 imágenes · 5 contacto · 6 sitio público · 7 panel de administración · 8 cierre (SEO, accesibilidad, tests) · 9 despliegue.

No adelantar fases: al terminar cada una, resumir y frenar.

## Estado actual y próximos pasos

_Última actualización: 2026-10-21._

- Fases 0 y 1: hechas y fusionadas en `dev` (Fase 1: PR #2, seed corrido en `portfolio_dev`).
- Fase 2: autenticación hecha y fusionada en `dev` (PR #3).
- Fase 3: API de contenido. Primera rama (`feature/content-catalog`) fusionada en `dev` (PR #4). Segunda rama (`feature/content-projects-experiences`: proyectos, experiencias, `/skills`; 183 tests pasan) pendiente de PR hacia `dev`.
- En una máquina nueva: clonar, `npm install`, crear `.env` desde `.env.example` (incluye `JWT_SECRET` de 32+ caracteres y `ADMIN_PASSWORD` de 12+), crear las bases `portfolio_dev` y `portfolio_test`, `npm run db:migrate -w server`, `npm run db:seed -w server`, `npm test`.
- Aprendizaje: en un CHECK de PostgreSQL, `NULL` cuenta como cumplido; para exigir un valor hay que agregar `IS NOT NULL` además de `btrim(col) <> ''`.
- Siguiente: Fase 4 (imágenes con Cloudinary: multer, sharp, cloudinary). Las respuestas actuales no se alteran, solo se agregan campos. Las migraciones ya aplicadas no se editan: se agregan nuevas.
- Diferido: borrado de imágenes con Cloudinary (Fase 4), tal como se describe en la sección Datos.
