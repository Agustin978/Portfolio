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

Windows + PowerShell, Node 24 LTS, PostgreSQL 18 local (base `portfolio_dev`). Todo debe funcionar en Windows.

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

**Datos** (Fase 1, aún no implementado): 13 tablas — admin_users, profile, project_categories, projects, experiences, technologies, project_technologies, experience_technologies, images, project_images, experience_images, social_links, contact_messages. Todo texto visible lleva columnas `_es` y `_en`; publicar exige ambos completos. CASCADE en tablas puente e imágenes asociadas; RESTRICT al borrar categoría o tecnología en uso. Los mensajes de contacto se guardan primero y el email se envía después (`email_status`).

## Convenciones

- Componentes y clases: PascalCase. Hooks y utilidades: camelCase. Tablas: snake_case plural. Columnas: snake_case.
- Archivos de módulo del servidor: `<modulo>.controller.ts`, `.service.ts`, `.repository.ts`, `.routes.ts`. Imports relativos con extensión `.js` (NodeNext).
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
```

## Fases

0 base del monorepo · 1 datos · 2 autenticación · 3 API de contenido · 4 imágenes · 5 contacto · 6 sitio público · 7 panel de administración · 8 cierre (SEO, accesibilidad, tests) · 9 despliegue.

No adelantar fases: al terminar cada una, resumir y frenar.
