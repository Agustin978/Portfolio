# Prueba manual de la Fase 6 (sitio público)

Guía para el cierre de la fase (plan, sección 20). La hace Agustín contra la API real con los datos demo. Lleva alrededor de una hora. Anotá lo que falle con la URL, el ancho y el idioma.

## Preparación

```powershell
npm ci
npm run db:seed-demo -w server   # si todavía no corrió en esta computadora
npm run dev
```

- Abrí http://localhost:5173/es en Chrome o Edge, con las DevTools (`F12`) y la barra de dispositivos (`Ctrl+Shift+M`) para fijar el ancho: **360**, **768** y **1280** px. Repetí cada bloque en `/es` y en `/en`.
- El envío real de correo se prueba **una sola vez** (el último bloque). El límite es de 5 envíos por hora por IP, contando los exitosos, y hay un tope de 50 correos por día.

## 1. Recorrido a 360, 768 y 1280 px

En cada ancho y en los dos idiomas:

- [ ] No hay scroll horizontal en la Home, en el detalle ni en la 404.
- [ ] Header: logo, menú (Proyectos, Sobre mí, Experiencia, Contacto) y selector ES/EN. A 360 px el menú pasa a una segunda fila y entra entero.
- [ ] Hero, Proyectos con filtro, Sobre mí con skills, Experiencia, Contacto y footer se ven completos.
- [ ] En Experiencia, cada fecha («MAR 2019», «ACTUALIDAD») se ve entera. Si se corta la línea, el corte va después del guion.
- [ ] Contacto: a 1280 px el formulario va a la derecha del panel; a 360 y 768 px, debajo.
- [ ] El selector de idioma conserva la página: desde `/es/projects/rucvm?x#y` lleva a `/en/projects/rucvm?x#y`.

## 2. Solo con teclado

Sin tocar el mouse, a 1280 px y después a 360 px:

- [ ] El primer `Tab` muestra «Saltar al contenido» y `Enter` lleva el foco al contenido.
- [ ] Cada elemento que recibe el foco muestra un anillo visible: oscuro sobre fondo claro y claro dentro del panel oscuro de contacto.
- [ ] El orden de `Tab` sigue el orden visual. El campo trampa del formulario nunca recibe el foco: de «Mensaje» se pasa directo a «Enviar mensaje».
- [ ] Filtro de proyectos: `Enter` o `Espacio` sobre una categoría filtra la lista, y la página no salta.
- [ ] «Ver detalle» abre el proyecto. Las miniaturas cambian la imagen con `Enter`. «← Proyectos» vuelve a la lista con el filtro que había.
- [ ] Formulario:
  - Dejá «Nombre» vacío y pasá con `Tab`: aparece «Este campo es obligatorio.».
  - Enviá con todo vacío: el foco va a «Nombre» y cada campo muestra su error.
  - Corregí todo y enviá con `Enter` desde «Email».

## 3. Estados de error

### API caída

1. Cortá `npm run dev` (`Ctrl+C`) y levantá solo el cliente: `npm run dev -w client`.
2. Recargá `/es`. Cada sección muestra su error con «Reintentar» y la página no se rompe. Verás el texto de conexión o el de servidor, según cómo responda el proxy de Vite.
3. Volvé a levantar `npm run dev` completo y tocá «Reintentar» en una sección: carga.
4. Variante sin cortar la API: en DevTools, pestaña Network, elegí «Offline» y enviá el formulario.
   - Aparece «No se pudo conectar con el servidor», con «Reintentar» y la línea «Si el problema sigue, escribime a …».
   - Lo que escribiste sigue en los campos.
   - Volvé a «No throttling» antes de seguir.

### 404 de proyecto

- [ ] `/es/projects/no-existe` muestra «Página no encontrada» con «Este proyecto no existe o ya no está publicado.» y «Volver al inicio». La pestaña dice «Página no encontrada · {nombre} · Portfolio».
- [ ] `/es/cualquier-cosa` muestra la 404 general. `/en/projects/no-existe` la muestra en inglés.

### 429 del formulario, sin mandar correos

El contador vive en la memoria del servidor: se reinicia al reiniciar `npm run dev`. Para llegar al límite sin guardar mensajes ni mandar correos, usá el campo trampa: con `hp_check` lleno, la API responde 201 sin guardar ni enviar nada, pero el envío cuenta para el límite.

1. Con `npm run dev` recién iniciado, en otra terminal de PowerShell (pasa por el proxy de Vite, igual que el navegador):

   ```powershell
   1..5 | ForEach-Object {
     Invoke-RestMethod -Method Post -Uri http://localhost:5173/api/v1/contact `
       -ContentType 'application/json' -Body '{"hp_check":"x"}'
   }
   ```

   Tienen que salir cinco respuestas con `received : True`.

2. En el sitio, completá el formulario con datos válidos y enviá. Tiene que aparecer «Se enviaron demasiados mensajes desde esta conexión. Probá de nuevo más tarde.», sin «Reintentar» y sin cuenta regresiva, y lo escrito sigue en los campos. Ese envío no se guarda.
3. Si en cambio aparece «Recibí tu mensaje.», el límite contó otra IP: ese mensaje sí se guardó y pudo salir el correo. Anotalo y seguí.
4. Reiniciá `npm run dev` para volver a cero.

## 4. Lector de pantalla (pasada rápida)

Con NVDA (gratis) o el Narrador de Windows (`Ctrl+Win+Enter`), en `/es`:

- [ ] Al cargar se anuncia el título de la pestaña. La lista de encabezados (NVDA: `Insert+F7`) muestra un solo h1, un h2 por sección y h3 en tarjetas y puestos.
- [ ] Los enlaces del selector se leen «Español» y «English»; el logo, «{nombre}, ir al inicio». Los enlaces externos agregan «se abre en otra pestaña».
- [ ] Un filtro se anuncia como botón presionado o no presionado.
- [ ] En el formulario, cada campo se lee con su etiqueta. Un campo con error se anuncia como no válido y con su mensaje; «Mensaje» lee también el contador. El campo trampa no aparece.
- [ ] Al enviar con éxito, el lector lee «Recibí tu mensaje.» (el foco queda en ese encabezado).
- [ ] En el detalle, las miniaturas se leen «Imagen 2 de 3» y la activa se anuncia como actual.

## 5. Envío real (una sola vez, al final)

Con Resend configurado en tu `.env`:

1. Enviá un mensaje desde `/es` con tu propio correo como remitente.
2. Tiene que aparecer «Recibí tu mensaje.» y llegarte el correo a `CONTACT_TO_EMAIL`.
3. Con Postman (`docs/postman/`), en `GET /admin/contact-messages`, el mensaje queda con `emailStatus` `sent`.
