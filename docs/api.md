# Contrato de la API

Base: `/api/v1`. Los ejemplos muestran la forma exacta de cada respuesta. Los campos solo se agregan, no se quitan (en la Fase 4 se suman imágenes).

## Convenciones

- Éxito: `{ "success": true, "data": …, "meta": {} }`. Las listas traen `meta.count`.
- Error: `{ "success": false, "error": { "code", "message", "details" } }`.
- Públicos: sin sesión, solo contenido publicado y activo, traducido con `?lang=es|en` (por defecto `es`; otro valor da 400). Si falta un texto en inglés se sirve el español.
- Administración: bajo `/admin`, requieren la cookie de sesión (`401 UNAUTHENTICATED` si no) y responden `Cache-Control: no-store`. Los textos llevan `…Es` y `…En`.
- Los PATCH son parciales: lo omitido no cambia, y `""` o `null` vacían un campo opcional. Se rechazan el body vacío y las claves desconocidas (400 `VALIDATION_ERROR`, con los mensajes por campo en `details`).
- Ids no numéricos o fuera de rango dan 400. Un id que no existe da 404.
- Listas con orden estable: `sortOrder` y desempate por `id`.

Códigos de error comunes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `FORBIDDEN_ORIGIN` 403, `NOT_FOUND` 404, `RATE_LIMITED` 429.

---

## Públicos

### `GET /profile?lang=en`

```json
{
  "success": true,
  "data": {
    "fullName": "Ana Pérez",
    "location": "Córdoba",
    "publicEmail": "ana@example.com",
    "cvUrl": "https://example.com/cv-en.pdf",
    "role": "Developer",
    "headline": "Headline",
    "intro": "Intro EN",
    "bio": "Bio ES",
    "availability": null
  },
  "meta": {}
}
```

`404 PROFILE_NOT_FOUND` si el seed no corrió. `bio` cae al español porque falta la versión en inglés.

### `GET /project-categories?lang=es`

Solo categorías con al menos un proyecto publicado y activo.

```json
{
  "success": true,
  "data": [
    { "slug": "web", "name": "Web" },
    { "slug": "data", "name": "Datos" }
  ],
  "meta": { "count": 2 }
}
```

### `GET /social-links`

Solo las visibles.

```json
{
  "success": true,
  "data": [
    { "platform": "github", "url": "https://github.com/ana" },
    { "platform": "linkedin", "url": "https://linkedin.com/in/ana" }
  ],
  "meta": { "count": 2 }
}
```

---

## Administración (`/admin`)

### Categorías de proyecto: `/admin/project-categories`

`GET /` (lista), `GET /:id`, `POST /` (201), `PATCH /:id`, `DELETE /:id`.

```json
{
  "success": true,
  "data": {
    "id": 3,
    "slug": "web",
    "nameEs": "Web",
    "nameEn": "Web",
    "sortOrder": 0,
    "projectsCount": 2
  },
  "meta": {}
}
```

- Crear: `slug` (kebab-case), `nameEs`, `nameEn` obligatorios; `sortOrder` por defecto 0.
- `409 SLUG_TAKEN` si el slug existe.
- `DELETE`: `200` con `data: null`. `409 CATEGORY_IN_USE` (`details: { "projects": 1 }`) si la usa algún proyecto, aunque esté desactivado.

### Tecnologías: `/admin/technologies`

Mismos verbos que las categorías.

```json
{
  "success": true,
  "data": {
    "id": 5,
    "slug": "react",
    "name": "React",
    "skillGroup": "development",
    "showInSkills": true,
    "sortOrder": 0,
    "projectsCount": 3,
    "experiencesCount": 1
  },
  "meta": {}
}
```

- `skillGroup`: `development | data | infrastructure | other` (por defecto `other`). `showInSkills` por defecto `false`.
- `409 SLUG_TAKEN`. `DELETE` con `409 TECHNOLOGY_IN_USE` (`details: { "projects": 1, "experiences": 1 }`) si está en uso.

### Perfil: `/admin/profile`

Registro único creado por el seed: solo `GET /` y `PATCH /`.

```json
{
  "success": true,
  "data": {
    "fullName": "Ana Pérez",
    "location": "Córdoba",
    "publicEmail": "ana@example.com",
    "cvUrlEs": "https://example.com/cv-es.pdf",
    "cvUrlEn": "https://example.com/cv-en.pdf",
    "roleEs": "Desarrolladora",
    "roleEn": "Developer",
    "headlineEs": "Titular",
    "headlineEn": "Headline",
    "introEs": "Intro ES",
    "introEn": "Intro EN",
    "bioEs": "Bio ES",
    "bioEn": null,
    "availabilityEs": null,
    "availabilityEn": null,
    "updatedAt": "2026-10-21T15:30:00.000Z"
  },
  "meta": {}
}
```

- `publicEmail` se normaliza (minúsculas) y debe ser un email válido. Las URLs del CV son solo `http(s)`.
- `404 PROFILE_NOT_FOUND` si el seed no corrió.

### Redes sociales: `/admin/social-links`

`GET /` (incluye ocultas), `POST /` (201), `PATCH /:id`. No hay DELETE: se oculta con `isVisible: false`.

```json
{
  "success": true,
  "data": {
    "id": 1,
    "platform": "github",
    "url": "https://github.com/ana",
    "isVisible": true,
    "sortOrder": 0
  },
  "meta": {}
}
```

- `platform` es la clave del icono (minúsculas, dígitos y guiones) y es única: `409 PLATFORM_TAKEN`.
- `url` solo `http(s)`.
