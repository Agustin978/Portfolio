# Contrato de la API

Base: `/api/v1`. Los ejemplos muestran la forma exacta de cada respuesta. Los campos solo se agregan, no se quitan (la Fase 4 sumó imágenes: solo agregó campos y endpoints).

## Convenciones

- Éxito: `{ "success": true, "data": …, "meta": {} }`. Las listas traen `meta.count`.
- Error: `{ "success": false, "error": { "code", "message", "details" } }`.
- Públicos: sin sesión, solo contenido publicado y activo, traducido con `?lang=es|en` (por defecto `es`; otro valor da 400). Si falta un texto en inglés se sirve el español.
- Administración: bajo `/admin`, requieren la cookie de sesión (`401 UNAUTHENTICATED` si no) y responden `Cache-Control: no-store`. Los textos llevan `…Es` y `…En`.
- Los PATCH son parciales: lo omitido no cambia, y `""` o `null` vacían un campo opcional. Se rechazan el body vacío y las claves desconocidas (400 `VALIDATION_ERROR`, con los mensajes por campo en `details`).
- Ids no numéricos o fuera de rango dan 400. Un id que no existe da 404.
- Listas con orden estable: `sortOrder` y desempate por `id`.

Códigos de error comunes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `FORBIDDEN_ORIGIN` 403, `NOT_FOUND` 404, `RATE_LIMITED` 429.

## Imágenes

Una imagen existe solo asociada a un proyecto o a una experiencia (no hay subida suelta). Se guardan en Cloudinary ya procesadas: WebP, 1920 px de ancho máximo, sin EXIF.

**Forma pública** (en todas las respuestas públicas):

```json
{
  "url": "https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/3f2a.webp",
  "width": 1920,
  "height": 1080,
  "alt": "Captura del panel"
}
```

- `width` y `height` son los del archivo guardado (ya reducido y rotado según EXIF), no los del original.
- `alt` sale en el idioma pedido con respaldo al español, y es `null` solo si faltan los dos. El cliente usa el título del proyecto como respaldo cuando `alt` es `null`.
- `url` es siempre `https`.

**Variantes por URL.** Se pide una variante insertando transformaciones justo después de `/upload/`:

```
https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/v1/portfolio/production/3f2a.webp
```

`f_auto` elige el formato y `q_auto` la calidad. Usar **solo estos anchos**: `400`, `800`, `1200`, `1920`. Cada variante nueva (cada combinación distinta de transformaciones) consume créditos de la cuota gratuita la primera vez que se genera; con un conjunto fijo el consumo queda acotado y predecible. No inventar anchos.

**Límites**: entrada hasta 10 MB, JPEG, PNG o WebP (SVG y GIF se rechazan), hasta 12 imágenes por proyecto o experiencia.

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

### `GET /projects?lang=es&category=web`

Publicados y activos, ordenados por `sortOrder` y luego `id`. `category` es opcional: un slug que no existe devuelve `200` con lista vacía, y vacío equivale a no filtrar. **Campos de lista** (sin `description`):

```json
{
  "success": true,
  "data": [
    {
      "slug": "mi-proyecto",
      "title": "Título",
      "summary": "Resumen",
      "repoUrl": "https://github.com/ana/mi-proyecto",
      "liveUrl": null,
      "startedAt": "2024-03-05",
      "endedAt": null,
      "isFeatured": true,
      "category": { "slug": "web", "name": "Web" },
      "technologies": [
        { "slug": "node", "name": "Node.js" },
        { "slug": "react", "name": "React" }
      ],
      "cover": {
        "url": "https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/3f2a.webp",
        "width": 1920,
        "height": 1080,
        "alt": "Captura del panel"
      }
    }
  ],
  "meta": { "count": 1 }
}
```

Las tecnologías van por el `sortOrder` de cada tecnología. Las fechas son `YYYY-MM-DD`. `cover` es la portada (forma pública de imagen). Un proyecto publicado y activo siempre tiene portada, así que `cover` no es `null` en la práctica.

### `GET /projects/:slug?lang=en`

**Campos de detalle**: los de la lista más `description` e `images` (todas las imágenes, portada incluida, ordenadas por `sortOrder` y luego `id`). `404 PROJECT_NOT_FOUND` si es borrador, está desactivado o no existe.

```json
{
  "success": true,
  "data": {
    "slug": "mi-proyecto",
    "title": "Title",
    "summary": "Summary",
    "description": "Description",
    "repoUrl": "https://github.com/ana/mi-proyecto",
    "liveUrl": null,
    "startedAt": "2024-03-05",
    "endedAt": null,
    "isFeatured": true,
    "category": { "slug": "web", "name": "Web" },
    "technologies": [{ "slug": "node", "name": "Node.js" }],
    "cover": {
      "url": "https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/3f2a.webp",
      "width": 1920,
      "height": 1080,
      "alt": "Dashboard screenshot"
    },
    "images": [
      {
        "url": "https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/3f2a.webp",
        "width": 1920,
        "height": 1080,
        "alt": "Dashboard screenshot"
      },
      {
        "url": "https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/9b1c.webp",
        "width": 1280,
        "height": 720,
        "alt": null
      }
    ]
  },
  "meta": {}
}
```

### `GET /experiences?lang=es`

Las posiciones actuales (`endDate: null`) primero y luego por `startDate` descendente; el empate se desempata por `id`. No hay endpoint de detalle: la lista ya trae la descripción.

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "company": "Acme",
      "companyUrl": "https://acme.example",
      "location": "Remoto",
      "role": "Desarrolladora",
      "description": "Descripción",
      "startDate": "2022-01-01",
      "endDate": null,
      "technologies": [{ "slug": "node", "name": "Node.js" }],
      "images": [
        {
          "url": "https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/7d4e.webp",
          "width": 1200,
          "height": 800,
          "alt": null
        }
      ]
    }
  ],
  "meta": { "count": 1 }
}
```

`images` va ordenado por `sortOrder` y luego `id`; las experiencias no tienen portada.

### `GET /skills`

Tecnologías con `showInSkills`, agrupadas por `skillGroup` en orden fijo (`development`, `data`, `infrastructure`, `other`); los grupos vacíos no aparecen. Los nombres de tecnologías no se traducen, así que no lleva `?lang`; el cliente traduce el nombre del grupo.

```json
{
  "success": true,
  "data": [
    {
      "group": "development",
      "technologies": [
        { "slug": "node", "name": "Node.js" },
        { "slug": "react", "name": "React" }
      ]
    },
    { "group": "data", "technologies": [{ "slug": "sql", "name": "SQL" }] }
  ],
  "meta": { "count": 2 }
}
```

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

### Proyectos: `/admin/projects`

`GET /` (`?includeDeactivated=true|false`, por defecto `false`; otro valor da 400), `GET /:id`, `POST /` (201), `PATCH /:id`, `PATCH /:id/deactivate`, `PATCH /:id/reactivate`. **No hay DELETE.**

Item de **lista**:

```json
{
  "id": 12,
  "slug": "mi-proyecto",
  "categoryId": 3,
  "titleEs": "Título",
  "titleEn": "Title",
  "status": "published",
  "isFeatured": true,
  "sortOrder": 0,
  "publishedAt": "2026-10-21T15:30:00.000Z",
  "deactivatedAt": null,
  "updatedAt": "2026-10-21T15:30:00.000Z"
}
```

**Detalle** (también lo devuelven create, update, deactivate y reactivate):

```json
{
  "success": true,
  "data": {
    "id": 12,
    "slug": "mi-proyecto",
    "categoryId": 3,
    "titleEs": "Título",
    "titleEn": "Title",
    "summaryEs": "Resumen",
    "summaryEn": "Summary",
    "descriptionEs": "Descripción",
    "descriptionEn": "Description",
    "repoUrl": "https://github.com/ana/mi-proyecto",
    "liveUrl": null,
    "startedAt": "2024-03-05",
    "endedAt": null,
    "status": "published",
    "isFeatured": true,
    "sortOrder": 0,
    "publishedAt": "2026-10-21T15:30:00.000Z",
    "deactivatedAt": null,
    "createdAt": "2026-10-21T15:00:00.000Z",
    "updatedAt": "2026-10-21T15:30:00.000Z",
    "technologyIds": [2, 5],
    "images": [
      {
        "id": 31,
        "url": "https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/3f2a.webp",
        "width": 1920,
        "height": 1080,
        "altEs": "Captura del panel",
        "altEn": "Dashboard screenshot",
        "sortOrder": 0,
        "isCover": true
      }
    ]
  },
  "meta": {}
}
```

La lista de administración no trae `images`.

- Crear: solo `slug` y `categoryId` son obligatorios (un borrador se puede guardar a medias). `status` por defecto `draft`, `isFeatured` `false`, `sortOrder` `0`. `publishedAt` y `deactivatedAt` no se escriben desde el body.
- `PATCH` es parcial y valida el **estado resultante**. Si queda publicado, deben estar completos `titleEs/En`, `summaryEs/En` y `descriptionEs/En` (un texto de solo espacios cuenta como vacío): `422 INCOMPLETE_TRANSLATION` con `details: { "missing": ["titleEn"] }`. Despublicar (`status: "draft"`) nunca exige nada.
- **Portada obligatoria**: publicar exige al menos una imagen, si no `422 MISSING_COVER`. Por eso un proyecto no se puede crear ya publicado: se crea el borrador, se sube la imagen y se publica. La validación de traducciones va primero (`INCOMPLETE_TRANSLATION`) y la de portada después. Un proyecto desactivado puede quedar publicado sin imágenes, pero `reactivate` vuelve a exigirlas (`422 MISSING_COVER`).
- `publishedAt` se fija la primera vez que se publica y no cambia después.
- El `slug` se puede cambiar solo mientras `publishedAt` sea nulo; después `409 SLUG_LOCKED` (reenviar el mismo slug no es error).
- Editar un proyecto desactivado está permitido y **nunca lo reactiva**.
- `technologyIds`: omitido no cambia nada, `[]` vacía el conjunto, una lista lo reemplaza; los repetidos se descartan. Todo ocurre en una transacción.
- Errores: `409 SLUG_TAKEN` (`details: { "slug": [...], "deactivated": true|false|null }`, indica si el que choca está desactivado), `422 INVALID_REFERENCE` (`categoryId` o `technologyIds` inexistentes, `details` con el campo), `400 VALIDATION_ERROR` (por ejemplo `endedAt` anterior a `startedAt`, fechas imposibles, URLs que no son `http(s)`), `404 PROJECT_NOT_FOUND`.
- `deactivate` y `reactivate`: `409 PROJECT_ALREADY_DEACTIVATED` / `PROJECT_NOT_DEACTIVATED` si ya está en ese estado.

### Experiencias: `/admin/experiences`

Mismos verbos y reglas que los proyectos (sin DELETE). Item de **lista**:

```json
{
  "id": 4,
  "company": "Acme",
  "roleEs": "Desarrolladora",
  "roleEn": "Developer",
  "startDate": "2022-01-01",
  "endDate": null,
  "status": "published",
  "sortOrder": 0,
  "deactivatedAt": null,
  "updatedAt": "2026-10-21T15:30:00.000Z"
}
```

**Detalle**:

```json
{
  "success": true,
  "data": {
    "id": 4,
    "company": "Acme",
    "companyUrl": "https://acme.example",
    "location": "Remoto",
    "roleEs": "Desarrolladora",
    "roleEn": "Developer",
    "descriptionEs": "Descripción",
    "descriptionEn": "Description",
    "startDate": "2022-01-01",
    "endDate": null,
    "status": "published",
    "sortOrder": 0,
    "deactivatedAt": null,
    "createdAt": "2026-10-21T15:00:00.000Z",
    "updatedAt": "2026-10-21T15:30:00.000Z",
    "technologyIds": [2, 5],
    "images": [
      {
        "id": 40,
        "url": "https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/7d4e.webp",
        "width": 1200,
        "height": 800,
        "altEs": null,
        "altEn": null,
        "sortOrder": 0
      }
    ]
  },
  "meta": {}
}
```

La lista de administración no trae `images`. Las experiencias no tienen portada: sus imágenes no llevan `isCover`.

- Crear: solo `company` y `startDate` son obligatorios. Para publicar deben estar completos `roleEs/En` y `descriptionEs/En` (`422 INCOMPLETE_TRANSLATION`).
- `endDate` anterior a `startDate` da `400` (se compara con la fecha guardada si el PATCH manda solo una).
- Las listas se ordenan igual que la API pública (actuales primero, luego `startDate` descendente, luego `id`). `sortOrder` se guarda y se devuelve, pero hoy no cambia el orden.
- Errores: `404 EXPERIENCE_NOT_FOUND`, `422 INVALID_REFERENCE` (`technologyIds`), `409 EXPERIENCE_ALREADY_DEACTIVATED` / `EXPERIENCE_NOT_DEACTIVATED`.

### Imágenes de un proyecto: `/admin/projects/:id/images`

- `POST /` (201): `multipart/form-data` con el archivo en el campo **`image`** y, opcionales, `altEs` y `altEn` (hasta 300 caracteres; vacío equivale a sin texto). Cualquier otro campo da 400.
- `PATCH /:imageId`: parcial, con `altEs`, `altEn` (`null` o `""` lo borra), `sortOrder` e `isCover`. Body vacío o claves desconocidas dan 400.
- `DELETE /:imageId` (200, `data: null`): quita la imagen del proyecto.

```json
{
  "success": true,
  "data": {
    "id": 31,
    "url": "https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/3f2a.webp",
    "width": 1920,
    "height": 1080,
    "altEs": "Captura del panel",
    "altEn": null,
    "sortOrder": 0,
    "isCover": true
  },
  "meta": {}
}
```

Reglas:

- **Portada automática**: la primera imagen que se sube queda como portada, y un proyecto con imágenes tiene siempre exactamente una. Las siguientes se agregan al final (`sortOrder` = máximo + 1).
- `isCover: true` en otra imagen **mueve** la portada. `isCover: false` sobre la portada actual da `400 CANNOT_UNSET_COVER`: hay que elegir otra. Sobre una imagen que no es portada no hace nada.
- Al quitar la portada y quedar imágenes, pasa a ser portada la siguiente por `sortOrder` y luego `id`.
- Quitar la **última** imagen de un proyecto publicado y activo da `409 COVER_REQUIRED`: antes hay que despublicarlo o desactivarlo.
- El orden se cambia con `sortOrder` (desempate por `id`). El reordenamiento atómico llegará con la pantalla del panel (Fase 7).
- Una imagen que no pertenece a ese proyecto da `404 IMAGE_NOT_FOUND`.
- La imagen se elimina de verdad solo al quitarla. El archivo de Cloudinary se borra después de confirmar la base; si ese borrado falla, el DELETE igual responde 200 y el error queda en el log con el `public_id`.

Errores de la subida, todos antes de tocar Cloudinary salvo el 502:

| Código                   | Status | Cuándo                                                                  |
| ------------------------ | ------ | ----------------------------------------------------------------------- |
| `VALIDATION_ERROR`       | 400    | Falta el archivo, campo con otro nombre, alt demasiado largo o ajeno    |
| `IMAGE_TOO_LARGE`        | 413    | Más de 10 MB, o dimensiones por encima de 50 megapíxeles                |
| `UNSUPPORTED_IMAGE`      | 415    | No es JPEG, PNG ni WebP (SVG, GIF), o el archivo está corrupto/truncado |
| `PROJECT_NOT_FOUND`      | 404    | El proyecto no existe                                                   |
| `IMAGE_LIMIT_REACHED`    | 409    | Ya tiene 12 imágenes                                                    |
| `IMAGE_UPLOAD_FAILED`    | 502    | Cloudinary falló al subir; no se crea nada y el mensaje es genérico     |
| `STORAGE_NOT_CONFIGURED` | 503    | Faltan las variables `CLOUDINARY_*` (solo posible fuera de producción)  |

Otros: `COVER_CONFLICT` 409 (dos cambios de portada simultáneos; reintentar).

### Imágenes de una experiencia: `/admin/experiences/:id/images`

Mismos tres endpoints y errores (con `EXPERIENCE_NOT_FOUND`), con estas diferencias: no existe portada, así que no hay `isCover` en el body de `PATCH` (400) ni en las respuestas, y no hay regla de última imagen.

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
