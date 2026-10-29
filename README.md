# Portfolio

Portfolio personal bilingüe (es/en) con panel de administración. Monorepo con npm workspaces: `client/` (React + Vite) y `server/` (Express).

## Requisitos (Windows)

- Node 24.14.0 y npm 11.9 (la versión exacta está en `.nvmrc` y en `engines` de `package.json`; usar otra puede reescribir `package-lock.json`). Con nvm-windows: `nvm install 24.14.0` y `nvm use 24.14.0`
- Git
- PostgreSQL 17 local con dos bases vacías: `portfolio_dev` y `portfolio_test`

## Puesta en marcha (PowerShell)

```powershell
git clone https://github.com/Agustin978/Portfolio.git
cd Portfolio
npm install
Copy-Item .env.example .env
```

Editá `.env` (queda fuera de git; `.env.example` solo trae los nombres). Si falta o es inválida una variable obligatoria, el servidor se detiene al arrancar y escribe `Invalid environment variables:` con el nombre de cada una.

| Variable                                                               | Cuándo hace falta                               | Detalle                                                                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLIENT_ORIGIN`                                                        | Siempre                                         | Origen del cliente, por ejemplo `http://localhost:5173`. Solo http(s); la barra final y la ruta se descartan                                         |
| `DATABASE_URL`                                                         | Siempre                                         | `postgresql://USUARIO:CLAVE@localhost:5432/portfolio_dev`                                                                                            |
| `JWT_SECRET`                                                           | Siempre                                         | 32 caracteres o más; sin ella el servidor aborta. Para generar una: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                        | Para `npm run db:seed`                          | La contraseña, de 12 caracteres o más. La API en marcha no las lee; volver a correr el seed con otra contraseña la rota                              |
| `TEST_DATABASE_URL`                                                    | Para `npm test`                                 | `postgresql://USUARIO:CLAVE@localhost:5432/portfolio_test`. El nombre debe terminar en `_test` porque los tests vacían las tablas                    |
| `PORT`                                                                 | Opcional                                        | 4000 por defecto                                                                                                                                     |
| `JWT_EXPIRES_IN_SECONDS`                                               | Opcional                                        | 28800 (8 horas) por defecto                                                                                                                          |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Obligatorias en producción, opcionales en local | Sin ellas, subir una imagen responde 503 `STORAGE_NOT_CONFIGURED`                                                                                    |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`             | Obligatorias en producción, opcionales en local | Sin ellas, los mensajes de contacto se guardan pero el envío queda como `failed: not configured`                                                     |

Después generá el cliente de Prisma (Prisma 7 no lo hace solo y `src/generated` no está en git), aplicá el esquema y cargá el admin:

```powershell
npm run db:generate -w server
npm run db:migrate -w server
npm run db:seed -w server
```

`npm test` necesita `TEST_DATABASE_URL`. Las migraciones se aplican solas antes de correr.

```powershell
npm run dev
```

- Cliente: http://localhost:5173 (redirige a `/es` o `/en` según el idioma del navegador)
- API: http://localhost:4000/api/v1/health (Vite también la expone por proxy en http://localhost:5173/api/v1/health)

## Comandos

| Comando          | Qué hace                       |
| ---------------- | ------------------------------ |
| `npm run dev`    | Cliente y servidor juntos      |
| `npm run lint`   | ESLint                         |
| `npm run format` | Prettier (escribe los cambios) |
| `npm test`       | Tests (Vitest + supertest)     |
| `npm run build`  | Build de cliente y servidor    |

## Flujo de trabajo

`main` es producción y `dev` integración. Cada tarea vive en una rama `feature/...` o `fix/...` creada desde `dev` y se integra por pull request. Más detalle en [CLAUDE.md](CLAUDE.md).
