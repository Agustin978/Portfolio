# Portfolio

Portfolio personal bilingüe (es/en) con panel de administración. Monorepo con npm workspaces: `client/` (React + Vite) y `server/` (Express).

## Requisitos (Windows)

- Node 24 LTS y npm
- Git
- PostgreSQL 18 local con una base `portfolio_dev` (se usa desde la Fase 1)

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

El resto de las variables se usan en fases posteriores.

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
