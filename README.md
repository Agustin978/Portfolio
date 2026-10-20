# Portfolio

Portfolio personal bilingüe (es/en) con panel de administración. Monorepo con npm workspaces: `client/` (React + Vite) y `server/` (Express).

## Requisitos (Windows)

- Node 24 LTS y npm
- Git
- PostgreSQL 17 local con dos bases vacías: `portfolio_dev` y `portfolio_test`

## Puesta en marcha (PowerShell)

```powershell
git clone https://github.com/Agustin978/Portfolio.git
cd Portfolio
npm install
Copy-Item .env.example .env
```

Editá `.env` y completá al menos:

```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

Para la base de datos (Fase 1):

```
DATABASE_URL=postgresql://USUARIO:CLAVE@localhost:5432/portfolio_dev
TEST_DATABASE_URL=postgresql://USUARIO:CLAVE@localhost:5432/portfolio_test
ADMIN_EMAIL=tu-email
ADMIN_PASSWORD=al-menos-12-caracteres
```

El resto de las variables se usan en fases posteriores. Después aplicá el esquema y cargá el admin:

```powershell
npm run db:migrate -w server
npm run db:seed -w server
```

`npm test` necesita `TEST_DATABASE_URL`: el nombre de la base debe terminar en `_test` porque los tests la vacían. Las migraciones se aplican solas antes de correr.

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
