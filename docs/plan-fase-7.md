# Plan de implementación: Fase 7, panel de administración

Este documento es la fuente de verdad de la Fase 7. Si algo de lo que ves en el repositorio contradice este plan, no lo resuelvas por tu cuenta: anotalo en el reporte del Paso 0 y esperá instrucciones. Donde el plan y `docs/api.md` difieran sobre una ruta o un campo, manda `docs/api.md` (lo escribió el servidor real); anotá la diferencia.

## 0. Reglas de trabajo

- Plan antes de código. Sin cambios de esquema de base de datos ni de estructura existente sin consentimiento previo del dueño del proyecto (Agustín). Un endpoint nuevo en el servidor cuenta como cambio de estructura: solo los que este plan aprueba (sección 6).
- Cada PR sale de una rama con nombre descriptivo, creada desde `dev` actualizado (`git checkout dev`, `git pull`). Nunca se commitea a `dev` ni a `main`. Nunca `push --force`. PR sin squash.
- Commits chicos, cada uno con sus tests. Lint, typecheck, build, tests y `format:check` en verde antes de cada push.
- Títulos de PR y commits en inglés (conventional commits). Descripciones en español. `gh` no está instalado: dejás el título y la descripción listos y Agustín abre y fusiona el PR en GitHub. La descripción va en un archivo fuera del repo y se copia al portapapeles con `Get-Content "$env:TEMP\<archivo>.md" -Raw -Encoding UTF8 | Set-Clipboard`.
- Al terminar cada PR: resumen corto y freno. No empezás el siguiente hasta que Agustín confirme que el anterior está fusionado en `dev`.
- Instalá solo las dependencias que usa cada PR. Si npm da conflictos de peers, frená y consultá (sin `--force` ni `--legacy-peer-deps`). El lockfile se regenera solo en su propio commit. Política de versiones: la más reciente publicada hace al menos 2 semanas, sin majors muy nuevos.
- Nunca imprimas valores de `.env` ni secretos: solo nombres de variables. La contraseña del admin del seed no se imprime, no se guarda en archivos del repo ni aparece en capturas.
- Los tests corren solo contra `portfolio_test`. Nunca contra `portfolio_dev`.
- **Procesos y puertos (regla de seguridad del dueño):**
  - Lo que iniciás lo cerrás vos, por PID y con su árbol de procesos. Nunca por nombre (`Stop-Process -Name node` y `taskkill /IM node.exe` están prohibidos: Claude Code corre sobre Node).
  - Al terminar verificás que los puertos que usaste quedaron libres (`Get-NetTCPConnection -State Listen -LocalPort ...`).
  - El `npm run dev` de Agustín (puertos 4000 y 5173) no se toca: lo inicia y lo cierra él.
  - Para servir el servidor compilado usá `node dist/server.js`, no `tsx` ni `tsx watch`. Sin `--host` ni `0.0.0.0` en desarrollo. Nada en segundo plano sin su cierre.
- **Capturas:** las respuestas de la API se interceptan en el navegador. Las capturas no escriben en `portfolio_dev`, no suben nada a Cloudinary y no envían correos. Las pruebas con escrituras reales las hace Agustín en la prueba manual.
- Los tests no tocan Cloudinary ni Resend: usan los dobles que ya existen.
- Idioma de trabajo: español, trato de vos.

## 1. Paso 0: reconocimiento del estado (solo lectura, obligatorio)

Esta fase puede continuarse desde otra computadora y con otro agente. Antes de cualquier cambio, reanalizá el proyecto. No modifiques nada en este paso.

1. **Git:** rama actual, `git status`, `git fetch --all --prune`, adelanto o atraso respecto de `origin/dev`, PRs fusionados (`git log --merges`), ramas ya fusionadas que se pueden borrar, y si hay commits en `dev` que no pasaron por PR.
2. **Entorno:** `node -v` y `npm -v` contra el pin (`.nvmrc`, `engines`). Si no coinciden, no ejecutes `npm install`: avisá la diferencia. Nombres (no valores) de las variables en `.env` y `client/.env`, contra `.env.example`; en particular `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLOUDINARY_*` y las del admin del seed.
3. **Verificación:** `npm run lint`, `npm run format:check`, `npm test` y `npm run build`, con resultados y duración. Tamaño de los chunks del cliente en el build (el principal estaba en unos 451 kB, el formulario de contacto en unos 121 kB).
4. **API de administración contra este plan (lo más importante):** leé `docs/api.md` y los esquemas Zod del servidor y verificá, ruta por ruta, lo de la sección 3. Respondé con evidencia:
   - ¿Existen los endpoints de administración de **mensajes de contacto** (listar, ver, marcar como leído, borrar)? ¿Qué campos tiene la tabla (estado de envío, leído, fecha, idioma)?
   - ¿El servidor exige portada para publicar un proyecto, o solo las dos traducciones completas?
   - ¿Hay un índice único sobre `(project_id, sort_order)` o equivalente en las imágenes? ¿`sortOrder` empieza en 0 o en 1?
   - Nombres exactos de los campos de cada recurso y de los códigos de error.
   - Cómo parte el sitio público las descripciones en párrafos (por línea en blanco, por salto de línea u otro), para que el panel lo indique bien.
5. **Cliente actual:** qué expone `apiClient` hoy (métodos, `credentials`, reintentos), cómo está armado el router (`createBrowserRouter` o no, y cómo se evita que `/admin` lo capture la ruta `/:lang`), qué primitivas existen en `components/`.
6. **Base `portfolio_dev`:** cantidad de registros por tabla y si el admin del seed puede iniciar sesión (sin imprimir la contraseña).

**Entregable del Paso 0:** reporte corto con (a) lo que coincide, (b) las diferencias, (c) los riesgos, (d) qué PR corresponde empezar. Frená y esperá la aprobación de Agustín.

## 2. Datos de referencia (última verificación; pueden haber cambiado)

- Fases 0 a 6 hechas y fusionadas en `dev`. La Fase 6 se cerró el 2026-11-28 (PR #14 del contacto y el PR de cierre). `main` no se toca hasta la Fase 9.
- Tests: 245 del cliente y 367 del servidor. No hay CI.
- Node 24.22.1 fijado; `npm ci` para instalaciones limpias.
- Cliente: React 19, Vite 8, Tailwind 4, react-router, TanStack Query, i18next, react-hook-form, zod, `@hookform/resolvers` 6.0.2, Vitest + Testing Library. El `apiClient` expone `get`, `post`, `put` y `delete`; manda `Content-Type` solo con body; reintenta solo GET ante fallos de red y 502/503/504 (máximo 2); `BASE_URL` fijo `/api/v1` (funciona con el proxy de Vite).
- Autenticación del servidor (Fase 2): `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`. JWT en cookie `httpOnly` de 2 horas sin refresh. El login tiene límite de 5 intentos cada 15 minutos por IP (en memoria; reiniciar el servidor lo resetea). Respuesta única `INVALID_CREDENTIALS` (401) para email inexistente y contraseña incorrecta. `trust proxy` ya está en 1.
- Origen exacto: el navegador debe entrar por `http://localhost:5173`; con `127.0.0.1` los POST, PATCH y DELETE dan 403 `FORBIDDEN_ORIGIN`.
- Cloudinary: la carpeta de desarrollo `portfolio/development` la comparten las dos computadoras.
- `portfolio_dev` tiene el contenido de `db:seed-demo` (3 categorías, 18 tecnologías, 4 proyectos, 2 experiencias, 2 redes) y el admin del seed.

## 3. Contexto técnico: la API de administración

Resumen de lo construido en las fases 2 a 5 (según sus planes; `docs/api.md` manda). Todo cuelga de `/api/v1/admin/...` con `requireAuth`.

| Recurso                  | Operaciones                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proyectos                | Listar (`?includeDeactivated=true`), ver uno con ambos idiomas, crear, `PATCH` parcial, `PATCH /:id/deactivate`, `PATCH /:id/reactivate`. Sin `DELETE`. |
| Experiencias             | Igual que proyectos.                                                                                                                                    |
| Categorías y tecnologías | CRUD. `DELETE` responde 409 si están en uso (cuenta proyectos desactivados).                                                                            |
| Perfil                   | `GET` y `PATCH`. Registro único.                                                                                                                        |
| Redes sociales           | Listar, crear y editar. Se ocultan con `is_visible`, no se borran.                                                                                      |
| Imágenes de proyectos    | `POST /projects/:id/images` (multipart, campo `image`, `altEs` y `altEn` opcionales), `PATCH` (`altEs`, `altEn`, `sortOrder`, `isCover`), `DELETE`.     |
| Imágenes de experiencias | Igual, sin portada.                                                                                                                                     |
| Mensajes de contacto     | A confirmar en el Paso 0.                                                                                                                               |

Reglas del servidor que el panel debe respetar y mostrar bien:

- **Publicar:** pasar a `published` exige las dos traducciones completas; si no, 422 `INCOMPLETE_TRANSLATION` con la lista de campos que faltan. `published_at` se fija la primera vez. Despublicar vuelve a `draft`.
- **Tecnologías de un proyecto:** `technologyIds: []` reemplaza el conjunto completo en una transacción.
- **Errores:** slug repetido 409; id inexistente 404; `endedAt` anterior a `startedAt` 400; URLs solo `http(s)`; 400 con detalles de Zod.
- **Imágenes:** JPEG, PNG y WebP (por contenido), máximo 5 MB y un archivo por request, tope de 12 por proyecto o experiencia (409 `IMAGE_LIMIT_REACHED`). Errores: 413 `IMAGE_TOO_LARGE`, 415 `UNSUPPORTED_IMAGE`, 400 si falta el archivo, 502 `IMAGE_UPLOAD_FAILED`, 503 `STORAGE_NOT_CONFIGURED`.
- **Portada:** un proyecto con imágenes tiene siempre exactamente una. La primera subida queda como portada. `isCover: true` en otra la mueve. `isCover: false` sobre la portada actual da 400. Si se quita la portada, la siguiente por `sortOrder` y luego por id pasa a serlo.
- Los proyectos y experiencias **no se borran**: se desactivan. Editar algo desactivado está permitido.

## 4. Alcance

**Dentro:**

- Pantalla de login, sesión y cierre de sesión.
- Estructura del panel (navegación, layout, avisos, diálogos).
- Gestión de categorías, tecnologías, redes sociales y perfil.
- Gestión de proyectos y de experiencias, con formulario bilingüe, publicar y despublicar, desactivar y reactivar.
- Gestión de imágenes: subir, textos alternativos, portada, reordenar y quitar.
- Bandeja de mensajes de contacto.
- Inicio del panel con conteos simples (borradores, mensajes sin leer, mensajes con envío fallido).
- Dos cambios de servidor acotados (sección 6).

**Fuera** (ver sección 22): cambio de contraseña, recuperación, refresh token, vista previa de borradores, arrastrar y soltar, editor de texto enriquecido, subida del CV, acciones en lote, SEO y auditoría completa de accesibilidad (Fase 8), cookies y dominios de producción (Fase 9).

## 5. Decisiones propuestas (Agustín las aprueba o ajusta)

Todas llevan una recomendación y el plan está escrito con ella.

- **D1. Idioma del panel:** solo español. El contenido que se edita sí es bilingüe. Los textos del panel van en un módulo tipado (`features/admin/strings.ts`), fuera de i18next, así el panel no pesa en el sitio público ni toca el test de paridad de es/en.
- **D2. Sesión vencida mientras editás:** la sesión dura 2 horas y no hay refresh. Si un guardado recibe 401, el panel muestra un diálogo para volver a iniciar sesión sin salir de la pantalla y reintenta el guardado, así no se pierde lo escrito. La alternativa más simple es redirigir al login (se perdería el formulario).
- **D3. Reordenar imágenes de forma atómica:** un endpoint nuevo por recurso (sección 6). Sin esto, ordenar con varios `PATCH` de `sortOrder` puede dejar el orden a medias si falla uno. Es el pendiente que `CLAUDE.md` dejó para esta fase.
- **D4. Formulario bilingüe:** dos bloques, "Español" y "English", en dos columnas desde 1024 px y apilados debajo. Sin pestañas: se ve de un vistazo qué falta y evita el patrón ARIA de pestañas.
- **D5. Mensajes de contacto:** si el servidor ya tiene los endpoints de administración, se usan. Si no, se agregan en un PR de servidor previo. Si hiciera falta una columna nueva (por ejemplo `read_at`), eso es un cambio de esquema y se consulta aparte.
- **D6. Diseño:** el plan incluye bocetos (sección 10). Si Agustín quiere verlos como mockups HTML antes de codear, se preparan para la lista, el formulario de proyecto y la gestión de imágenes.
- **D7. Dependencias:** ninguna nueva. Diálogos con el elemento nativo `<dialog>`, fechas con `<input type="date">`, sin librería de UI.

## 6. Cambios de servidor (PR 1, y PR 1b si hace falta)

**6.1 Reordenamiento atómico de imágenes (aprobado por D3).** Sin cambio de esquema.

- `PUT /api/v1/admin/projects/:id/images/order` y `PUT /api/v1/admin/experiences/:id/images/order`.
- Body: `{ "imageIds": [3, 1, 2] }`, la lista completa de las imágenes del proyecto o experiencia en el orden nuevo.
- Valida que sea exactamente el conjunto actual (sin faltantes, sin repetidos, sin ids de otro recurso). Si no coincide: 400 `INVALID_IMAGE_ORDER` y no cambia nada. Eso cubre también el caso de una segunda pestaña que subió o borró una imagen entre medio: el panel recarga y avisa.
- Actualiza `sortOrder` de todas en una sola transacción, con la base de numeración que ya usa el servidor. Responde la lista de imágenes en el formato de detalle de administración.
- Si hay un índice único sobre `(project_id, sort_order)` que obligue a pasos intermedios, resolvelo dentro de la transacción. Si requiere cambiar el esquema, frená y consultá.
- Tests contra `portfolio_test`: orden válido, conjunto incompleto, repetidos, id ajeno, 401 sin sesión, atomicidad (si falla a la mitad no queda nada cambiado) y que el resto de las reglas (portada, tope) no se alteran. Actualizar `docs/api.md`.
- El `PATCH` de `sortOrder` por imagen sigue existiendo, pero el panel no lo usa para reordenar.

**6.2 Mensajes de contacto (PR 1b, solo si el Paso 0 muestra que faltan).**

- Listar (más nuevos primero), ver uno, marcar como leído o no leído y borrar. Borrar de verdad está permitido para mensajes de contacto según `CLAUDE.md`.
- Si la tabla ya tiene un campo para "leído", no hay migración. Si no, frená y consultá antes de tocar el esquema.
- Los endpoints nunca devuelven más campos que los necesarios. Tests con 401 sin sesión.

## 7. Rutas y estructura del cliente

- El panel vive bajo `/admin`, fuera de `/:lang`. Verificá que `/admin` no lo capture la ruta de idioma (el router debe declarar `/admin/*` antes, o la ruta de idioma debe validar `es|en`). Con test.
- Todo el panel se carga con `React.lazy` a nivel de ruta. **Presupuesto:** el chunk principal del sitio público no crece más de ~2 kB (solo la ruta lazy); el panel va en chunks propios. Verificalo en el output del build en cada PR de cliente.
- Rutas:

| Ruta                                 | Pantalla                              |
| ------------------------------------ | ------------------------------------- |
| `/admin/login`                       | Login                                 |
| `/admin`                             | Inicio con conteos                    |
| `/admin/projects`, `/new`, `/:id`    | Lista, alta y edición de proyectos    |
| `/admin/experiences`, `/new`, `/:id` | Lista, alta y edición de experiencias |
| `/admin/categories`                  | Categorías                            |
| `/admin/technologies`                | Tecnologías                           |
| `/admin/social-links`                | Redes                                 |
| `/admin/profile`                     | Perfil                                |
| `/admin/messages`, `/:id`            | Bandeja y detalle                     |

- Cada pantalla del panel lleva `<meta name="robots" content="noindex, nofollow">` (React 19 la sube al `<head>`) y título «{pantalla} · Panel · Agustín».
- Tras cada cambio de ruta, el foco va al `h1` de la pantalla (`tabindex="-1"`) y se anuncia el cambio.

## 8. Sesión y autenticación en el cliente

- La sesión se conoce con `GET /auth/me` (TanStack Query, clave `['admin', 'me']`). El JWT está en una cookie `httpOnly`: el cliente no lo ve, no lo guarda y no lo lee nunca.
- `credentials: 'include'` solo en las llamadas de administración (en desarrollo el proxy de Vite las hace del mismo origen).
- `ProtectedRoute`: mientras `/me` carga, muestra un estado de carga accesible; con 401, redirige a `/admin/login` guardando la ruta de origen; ya logueado, `/admin/login` redirige al inicio.
- Login: email y contraseña, `autocomplete="username"` y `current-password` (compatible con gestores de contraseñas), mostrar u ocultar contraseña con botón accesible. Errores: 401 con el mensaje único «Email o contraseña incorrectos» (nunca distingue cuál), 429 con «Demasiados intentos. Probá de nuevo en unos minutos», red con reintento. Sin enlace de «olvidé mi contraseña».
- Logout: `POST /auth/logout`, limpia la caché de React Query (todo, no solo `me`) y redirige al login.
- **401 en cualquier llamada de administración (D2):** un solo manejador en el `apiClient`. Si la sesión venció, se abre el diálogo de reautenticación; al volver a iniciar sesión se reintenta la acción que falló. Si el usuario cancela, va al login. Los formularios mantienen sus datos mientras tanto.
- Aviso de cambios sin guardar: `beforeunload` y, si el router lo permite, bloqueo de navegación interna con confirmación.

## 9. Cliente de API y errores

Cambios en `apiClient` (los apruebas con este plan):

- Agregar `patch`.
- Cuerpo `FormData`: no se fija `Content-Type` (el navegador agrega el `boundary`).
- `delete` y respuestas sin contenido (204) sin romper el parseo.
- Gancho de 401 (sección 8). Los reintentos siguen siendo solo para GET. **POST, PATCH, PUT y DELETE nunca se reintentan solos.**
- Los servicios de administración van aparte (`services/admin/`), un archivo por recurso con sus tipos. Los tipos del panel incluyen ambos idiomas (`titleEs`, `titleEn`, etc.), distintos de los públicos.

Errores: a diferencia del sitio público, el panel sí distingue códigos, pero siempre con textos propios en español (nunca muestra el mensaje crudo del servidor):

| Respuesta                         | Qué muestra el panel                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 400 con detalles de Zod           | Error en el campo correspondiente y resumen arriba                                                                |
| 422 `INCOMPLETE_TRANSLATION`      | «Para publicar falta completar:» con la lista traducida a las etiquetas de los campos, cada una enlazada al campo |
| 409 slug repetido                 | Error en el campo slug                                                                                            |
| 409 categoría o tecnología en uso | «No se puede borrar: está en uso por N proyectos» (si el servidor da el dato)                                     |
| 409 `IMAGE_LIMIT_REACHED`         | «Se alcanzó el máximo de 12 imágenes»                                                                             |
| 413, 415                          | «La imagen pesa más de 5 MB» y «Formato no admitido (JPEG, PNG o WebP)»                                           |
| 502 `IMAGE_UPLOAD_FAILED`         | «No se pudo subir la imagen. Probá de nuevo»                                                                      |
| 503 `STORAGE_NOT_CONFIGURED`      | «El almacenamiento de imágenes no está configurado en este entorno»                                               |
| 403 `FORBIDDEN_ORIGIN`            | «Acceso no permitido desde este origen»                                                                           |
| 404                               | «Ya no existe» y vuelve a la lista                                                                                |
| Red, timeout, 5xx                 | Mensaje con «Reintentar»                                                                                          |

## 10. Diseño

Estética del sitio público (tokens de la Fase 6, Geist, container y radios), pero utilitaria: lo que importa es leer y editar rápido. Tema claro. Se amplían los tokens solo con lo que falte para estados: `danger` (texto de error sobre claro, mínimo 4,5:1), `success` y `warning` con sus fondos suaves. Verificá contraste: texto 4,5:1, bordes de campos e iconos 3:1. Zonas táctiles de 44 px como mínimo. Usable a 360, 768 y 1280 px.

Estructura (≥ 1024 px: barra lateral; debajo, barra superior con botón de texto «Menú» que despliega la navegación):

```
+---------------+-----------------------------------------------------------+
| ● Panel       |  Proyectos                              [ Nuevo proyecto ] |
|               |  [ ] Mostrar desactivados                                  |
| Inicio        |  Título      Estado      Categoría   Orden   Acciones      |
| Proyectos     |  RUCVM       Publicado   Web         1       Editar        |
| Experiencia   |  Sitio demo  Borrador    IA          2       Editar        |
| Categorías    |  (desactivado) Tesis     Desactivado Web     3  Reactivar   |
| Tecnologías   |                                                            |
| Redes         |  En pantallas chicas cada fila pasa a una tarjeta.         |
| Perfil        |                                                            |
| Mensajes (2)  |                                                            |
| Salir         |                                                            |
+---------------+-----------------------------------------------------------+
```

Formulario de proyecto (los campos exactos salen de `docs/api.md`):

```
← Proyectos
Editar proyecto · RUCVM        Estado: Borrador          [ Ver en el sitio ↗ ]
[ Resumen de errores, con enlaces a cada campo ]

Datos generales
  Slug [__________]  Categoría [ v ]  Orden [ 1 ]
  Inicio [ fecha ]  Fin [ fecha ] (vacío = actualidad)
  Código (URL) [__________]   Demo (URL) [__________]
  Tecnologías  (casillas agrupadas por grupo)

Español                               | English
  Título [____________]               |   Title [____________]
  Resumen [____________]              |   Summary [____________]
  Descripción [________]              |   Description [________]
  (Separá los párrafos con ...)       |

[ Guardar cambios ]  [ Publicar ]  [ Desactivar ]

Imágenes (3 de 12)                        [ Subir imágenes… ]
  (Se guardan solas. Disponible una vez creado el proyecto.)
```

Gestión de imágenes:

```
+---------+  ★ Portada
|  thumb  |  Texto alternativo ES [____________]   EN [____________]
+---------+  [ Guardar textos ] [ Mover antes ] [ Mover después ]
             [ Usar como portada ] [ Quitar imagen ]
```

Bandeja de mensajes: lista con estado de lectura (los no leídos, en negrita y con la palabra «Nuevo», nunca solo color) y estado de envío («Enviado» o «El correo falló: este mensaje no te llegó por mail»). Detalle con nombre, email (enlace `mailto:`), fecha, idioma del visitante y el texto con los saltos de línea respetados.

Estados de cada pantalla: cargando (`role="status"`), vacío («Todavía no hay proyectos» con el botón de crear), error con «Reintentar» y éxito. Los avisos de éxito van en una región `role="status"` y los errores bloqueantes en `role="alert"`.

## 11. Formularios y reglas de contenido

- `react-hook-form` + `zod` con `zodResolver`, modo `onTouched`. Los esquemas replican los límites del servidor (que sigue siendo la autoridad; la duplicación se documenta).
- Resumen de errores al enviar: un bloque con `role="alert"` y enlaces a cada campo; el foco va al resumen. Cada campo inválido tiene `aria-invalid` y `aria-describedby`.
- Botones de envío con `aria-disabled` mientras guardan (no `disabled`, para no perder el foco) y sin doble envío.
- **Slug:** se propone automáticamente desde el título en español (minúsculas, sin tildes, guiones) mientras el proyecto no se haya guardado; después no se toca solo. Si se cambia el slug de uno **publicado**, el panel avisa que el enlace público cambia.
- **Publicar:** botón aparte de guardar. Si el servidor responde 422, se muestra la lista de campos faltantes. Mientras falte una traducción, junto al título de cada bloque de idioma se indica «Incompleto». Si el Paso 0 muestra que el servidor no exige portada, el panel igual avisa («Este proyecto no tiene portada») antes de publicar y deja decidir.
- **Desactivar y reactivar:** con diálogo de confirmación que nombra el elemento. El texto aclara que no se borra y que deja de verse en el sitio. Los desactivados se ven con «Mostrar desactivados» y se pueden editar.
- **Orden:** campo numérico `sortOrder` en los formularios (pocos registros; sin arrastrar).
- **Fechas:** `<input type="date">`; se envían como `YYYY-MM-DD`. Fin vacío significa actualidad.
- **URLs:** solo `http(s)`; el panel valida antes de enviar.
- **Perfil:** un único formulario con ambos idiomas; el CV es solo una URL (no hay subida de archivos).
- **Redes:** la clave («github», «linkedin», otras) con las claves que ya conoce el sitio, URL, orden y casilla «Visible». Nunca se borran.
- **Categorías y tecnologías:** el botón de borrar maneja el 409 con un mensaje claro y el alta/edición con sus campos.
- Un recurso nuevo se crea primero como borrador; recién entonces se habilitan las imágenes.

## 12. Imágenes

- Selector de archivos nativo (`<input type="file" accept="image/jpeg,image/png,image/webp" multiple>`) con etiqueta visible. El arrastrar y soltar queda fuera.
- Antes de subir, validación rápida del lado del cliente de tipo y peso (5 MB) con el mismo mensaje que el servidor; el servidor sigue siendo la autoridad.
- **Subida en secuencia**, una por una (el servidor acepta un archivo por request y así se conserva el orden y se limita el daño ante un fallo). Cada archivo muestra su estado: en cola, subiendo, listo o error con motivo y «Reintentar». Los que fallan no frenan a los demás. Se corta al llegar al tope de 12.
- Miniaturas con `imageUrl()` (ancho 400) y `width`/`height` reales, sin saltos de layout.
- **Textos alternativos:** campos ES y EN por imagen con botón «Guardar textos» propio. Son opcionales, pero el panel marca «Sin texto alternativo» como recordatorio.
- **Portada:** botón «Usar como portada» (deshabilitado en la actual, con la razón visible: «Es la portada. Elegí otra para cambiarla»).
- **Reordenar:** botones «Mover antes» y «Mover después» (accesibles por teclado), que llaman al endpoint atómico de la sección 6. Una región `aria-live` anuncia «Imagen movida a la posición 2 de 5». Si el servidor responde 400 `INVALID_IMAGE_ORDER`, se recarga la lista y se avisa.
- **Quitar imagen:** con confirmación que nombra la imagen y explica qué pasa («Se quita de este proyecto y se borra el archivo si no se usa en otro lado»). Si era la portada, el panel muestra cuál pasó a serlo (la respuesta del servidor).
- Carpeta compartida: en desarrollo, las dos computadoras suben a `portfolio/development`.

## 13. Mensajes de contacto

- Lista de más nuevos a más viejos, sin paginación a menos que el servidor la ofrezca. Filtros simples: «Sin leer» y «Con envío fallido».
- Abrir un mensaje no lo marca como leído por sí solo: hay un botón explícito «Marcar como leído / no leído» (evita cambios de estado por navegar con el teclado o por una carga accidental).
- Borrado real con confirmación («Esta acción no se puede deshacer»).
- **Seguridad del contenido:** el texto del visitante se renderiza siempre como texto plano (nunca `dangerouslySetInnerHTML`, nunca convertir a enlaces automáticamente). El email se muestra como texto y en un `mailto:` construido con el valor escapado.
- Un mensaje con envío fallido es información importante: el correo no llegó. Se muestra de forma visible (texto, no solo color) y cuenta en el inicio del panel.

## 14. Accesibilidad

- Salto al contenido, un solo `h1` por pantalla, regiones con nombre (`nav` principal, `main`), foco al `h1` al cambiar de ruta.
- Todo control con nombre accesible no vacío, incluidos los botones por fila con el nombre del elemento («Editar RUCVM», «Desactivar RUCVM»). Test de nombres como en la Fase 6 para cada pantalla.
- Tablas reales (`<table>`, `<caption>`, `scope`) en escritorio; en pantallas chicas, tarjetas con el mismo contenido y orden de lectura.
- Diálogos con `<dialog>` y `showModal()` (foco atrapado, Escape cierra, el foco vuelve al botón que lo abrió). Sin alertas nativas del navegador.
- Estados siempre con texto además del color (Publicado, Borrador, Desactivado, Nuevo, Falló el envío).
- Foco visible en todo; zonas táctiles de 44 px; sin pérdida de funcionalidad al 200 % de zoom.
- Reducción de movimiento: sin animaciones que no respeten `prefers-reduced-motion`.
- La auditoría completa con herramientas queda para la Fase 8; en esta fase: teclado solo y una pasada con lector de pantalla en la prueba manual.

## 15. Seguridad

- Cookie `httpOnly`: el JS del cliente nunca ve el token. No se guarda nada sensible en `localStorage`, ni en la URL, ni en la consola.
- El panel nunca registra contraseñas, ni contenido de mensajes, ni datos de la sesión en la consola.
- CSRF: la cookie lleva `SameSite` y el servidor tiene la guardia de origen exacto para los métodos que cambian datos. Los tests del cliente no deben debilitarla.
- Mensajes de login que no revelan si el email existe.
- El panel solo renderiza texto plano proveniente de la base. Los únicos enlaces son URLs `http(s)` validadas y `mailto:`; los enlaces externos llevan `rel="noopener noreferrer"`.
- `noindex, nofollow` en todas las pantallas del panel.
- Para la Fase 9 queda anotado: cabeceras de seguridad (`frame-ancestors 'none'`, `X-Robots-Tag: noindex` en `/admin`) y la estrategia de cookies entre dominios.

## 16. Tests

Mismas herramientas que la Fase 6 (Vitest, jsdom, Testing Library) y el mismo mecanismo de doble de `fetch`. Nada de red real.

- **apiClient:** `patch`; `FormData` sin `Content-Type` fijo; 204; gancho de 401; ningún método distinto de GET se reintenta.
- **Sesión:** `ProtectedRoute` (carga, 401, ya logueado); login con 401, 429 y red; logout limpia la caché; el diálogo de reautenticación reintenta el guardado y no pierde el formulario.
- **Ruteo:** `/admin` no lo captura `/:lang`; las pantallas del panel tienen `noindex`; el foco va al `h1`.
- **Formularios:** validación por campo, resumen de errores con foco, 422 mapeado a campos con enlaces, 409 de slug, doble envío, `aria-disabled`.
- **Proyectos y experiencias:** crear, editar con `PATCH` parcial (solo lo cambiado), publicar, despublicar, desactivar y reactivar con confirmación, orden.
- **Imágenes:** subida en secuencia (orden, error de una sin frenar las demás, tope de 12), 413 y 415 mapeados, portada y su regla visible, reordenar llama al endpoint atómico y anuncia el cambio, `INVALID_IMAGE_ORDER` recarga.
- **Mensajes:** texto plano (un mensaje con `<script>` y HTML se muestra literal), marcar leído, borrar con confirmación, estado de envío fallido visible.
- **Accesibilidad:** todo enlace y botón con nombre no vacío en cada pantalla; los diálogos devuelven el foco.
- **Servidor** (PR 1 y 1b): sección 6.

## 17. Dependencias

Ninguna nueva (D7). Si en algún PR parece necesaria una, frená y consultá antes de instalar.

## 18. Estructura de archivos

```
client/src/
  services/admin/        apiClient admin + un archivo por recurso (tipos incluidos)
  features/admin/
    strings.ts           textos del panel (solo español)
    auth/                AuthProvider, ProtectedRoute, LoginPage, ReauthDialog
    layout/              AdminLayout, nav, skip link, noindex
    ui/                  FormField, ErrorSummary, ConfirmDialog, StatusRegion, DataList
    catalog/             categorías, tecnologías, redes, perfil
    projects/            lista, formulario, publicación
    experiences/         lista, formulario
    images/              ImageManager (usado por proyectos y experiencias)
    messages/            bandeja y detalle
    dashboard/           inicio con conteos
server/src/modules/images/   endpoint de orden (PR 1)
```

Los componentes presentacionales no llaman a la API; los contenedores usan los hooks. Claves de React Query agrupadas por recurso (`['admin', 'projects']`) para invalidar bien tras cada cambio.

## 19. PRs y commits

Cada uno sale de `dev`, lleva sus tests y se aprueba por separado. Al terminar, resumen corto y freno.

| #   | Rama                         | Contenido                                                                                                                                            |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `chore/phase-7-plan`         | Guardar este plan en `docs/plan-fase-7.md` y poner la Fase 7 «en curso» en `CLAUDE.md`. Solo docs.                                                   |
| 1   | `feature/images-reorder`     | Endpoint atómico de reordenamiento de imágenes (proyectos y experiencias), tests y `docs/api.md`.                                                    |
| 1b  | `feature/admin-messages-api` | Solo si el Paso 0 muestra que faltan los endpoints de mensajes.                                                                                      |
| 2   | `feature/admin-foundation`   | `apiClient` (`patch`, multipart, 401), ruteo lazy de `/admin`, sesión, login, layout del panel, primitivas, reautenticación, presupuesto del bundle. |
| 3   | `feature/admin-catalog`      | Categorías, tecnologías, redes sociales y perfil. Fija los patrones de formularios y listas.                                                         |
| 4   | `feature/admin-projects`     | Lista y formulario bilingüe de proyectos, tecnologías, publicar y despublicar, desactivar y reactivar. Sin imágenes.                                 |
| 5   | `feature/admin-images`       | `ImageManager` en proyectos: subir, textos alternativos, portada, reordenar y quitar.                                                                |
| 6   | `feature/admin-experiences`  | Experiencias con su formulario y el `ImageManager`.                                                                                                  |
| 7   | `feature/admin-messages`     | Bandeja y detalle de mensajes.                                                                                                                       |
| 8   | `chore/phase-7-wrap-up`      | Inicio con conteos, pasada de estados y responsive, `CLAUDE.md`, `README` y `docs/prueba-manual-fase-7.md`.                                          |

Los PR 2 en adelante necesitan que el PR 1 esté fusionado solo si usan el endpoint de orden (el 5 y el 6). El resto puede avanzar en el orden indicado.

Capturas por PR de cliente (interceptando la API, sin escribir datos): celular y escritorio de cada pantalla nueva y de sus estados (vacío, cargando, error, éxito). Se guardan en `%TEMP%\portfolio-capturas\prN\`.

## 20. Guía de prueba manual y cierre de la fase

El PR 8 deja `docs/prueba-manual-fase-7.md`. Agustín la ejecuta contra la API real, en el navegador, en `http://localhost:5173`. Orden pensado para no gastar cupos de más:

1. **Login:** credenciales correctas y sesión persistente al recargar. El bloqueo por intentos fallidos (5 cada 15 minutos) va **al final de la guía** y se resetea reiniciando el servidor.
2. **Sesión vencida:** con `JWT_EXPIRES_IN` corto en el `.env` local (por ejemplo 1 minuto) y el servidor reiniciado, editar un proyecto, esperar a que venza y guardar: debe aparecer el diálogo, reiniciar sesión y completar el guardado sin perder lo escrito. Después restaurar el valor.
3. **Catálogo:** crear, editar y borrar (en uso y sin uso) categorías y tecnologías; perfil; redes (ocultar y mostrar).
4. **Proyectos:** crear como borrador, error de slug repetido, intentar publicar incompleto (422 con lista), completar las dos traducciones y publicar, comprobar en el sitio público en español e inglés, despublicar, desactivar y reactivar.
5. **Imágenes (escriben en Cloudinary de desarrollo):** subir válida, SVG (415), archivo de más de 5 MB (413), llegar al tope de 12 (409), portada, reordenar con teclado, textos alternativos, quitar la portada y ver cuál la reemplaza. Verificar el resultado en el sitio público.
6. **Experiencias:** alta, edición, publicación e imágenes.
7. **Mensajes:** enviar uno desde el formulario público (gasta cupo del contacto), verlo en la bandeja, marcarlo, borrarlo. Si se prueba con Resend sin configurar, debe verse como envío fallido.
8. **Transversales:** 360, 768 y 1280 px; solo teclado en los flujos principales; pasada con NVDA o Narrador (login, un formulario con errores, un diálogo, subir una imagen); consola sin errores.
9. **Cierre:** logout (la sesión queda inválida: `GET /auth/me` da 401) y el bloqueo por intentos fallidos.

**Cierre de la fase:**

- Lint, typecheck, build, tests y `format:check` en verde.
- El chunk principal del sitio público no creció más de ~2 kB respecto del cierre de la Fase 6.
- La prueba manual completa sin hallazgos abiertos.
- `CLAUDE.md` y `README` actualizados (cómo entrar al panel, qué rutas existen, reglas de imágenes).
- Un commit de docs en una rama propia marca la fase como cerrada, igual que en la Fase 6. Resumen y freno: la Fase 8 no empieza sin aprobación.

## 21. Riesgos y avisos

- **Sesión de 2 horas sin refresh:** de ahí el diálogo de reautenticación. Si resultara molesto, se evalúa subir la duración o agregar refresh en otra fase.
- **Límite de login en memoria:** se resetea al reiniciar el servidor. En Render se reinicia con cada deploy o cuando la instancia se duerme (aceptable).
- **Origen exacto:** entrar por `http://localhost:5173`. Con `127.0.0.1` las escrituras dan 403.
- **Cambiar el slug de un proyecto publicado** rompe el enlace público: el panel avisa.
- **Cuota de Cloudinary:** cada prueba de subida cuenta. Usar imágenes de prueba livianas y quitar las que sobren (el borrado libera el archivo).
- **Contenido real:** el panel local escribe en `portfolio_dev`. Nada de lo que se cargue acá viaja a producción solo (ver sección 22).
- **Cookies entre dominios (Fase 9):** el panel es la primera función que depende de la cookie de sesión. Con el sitio en Cloudflare Pages y la API en Render, en dominios distintos, `SameSite=None; Secure` puede fallar en Safari y en navegadores que bloquean cookies de terceros. Las salidas son un dominio propio con subdominios, o que Cloudflare Pages reenvíe `/api` a Render para que sea mismo origen. Conviene decidirlo antes del despliegue.
- **Dos computadoras:** cada una tiene su propia base local; solo la carpeta de Cloudinary es compartida. Un proyecto creado con el panel en una no aparece en la otra.

## 22. Fuera de esta fase (para las siguientes)

- **Fase 8:** CI (`.github/`), SEO y prerender del sitio público, auditoría completa de accesibilidad (incluido el panel), Lighthouse, Geist autoalojada, evaluar `@hookform/resolvers` 7, confirmar en Chrome y Firefox el aviso de Edge sobre el almacenamiento de `res.cloudinary.com`.
- **Fase 9:** `BASE_URL` configurable, cookies de sesión entre dominios, dominio de Resend, `_redirects`, CSP y cabeceras (`frame-ancestors`, `X-Robots-Tag` en `/admin`), `NODE_VERSION` en el hosting, ping para evitar el arranque en frío, verificación de `trust proxy` con Render, `HOST=0.0.0.0` en Render, sin depender de scripts de postinstall, y **cómo se carga el contenido real en producción** (por el panel contra la API de producción, ya que la base local no se migra).
- **Otras fases o nunca:** cambio de contraseña y recuperación (hoy se resuelve re-corriendo el seed), refresh token, doble factor, vista previa de borradores (hoy: publicar, mirar y despublicar), arrastrar y soltar, editor enriquecido o Markdown, subida del CV, acciones en lote, registro de auditoría.
