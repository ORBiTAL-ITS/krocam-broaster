# Paso a paso: notificaciones con Vercel + WhatsApp

Sigue este orden para tener el proyecto en GitHub y la API de notificaciones funcionando en Vercel.

---

## Parte 1: Subir el proyecto a GitHub

### 1.1 Crear el repositorio en GitHub

1. Entra en [github.com](https://github.com) e inicia sesión.
2. Clic en **"+"** (arriba derecha) → **"New repository"**.
3. Configura:
   - **Repository name:** por ejemplo `LP-Free` o `krocam-broaster`.
   - **Visibility:** Public o Private, como prefieras.
   - **No** marques "Add a README", "Add .gitignore" ni "Choose a license" (ya tienes todo en local).
4. Clic en **"Create repository"**.

### 1.2 Conectar tu carpeta local con GitHub y subir

En la terminal, desde la carpeta del proyecto (`/Users/mac/Documents/LP-Free`):

```bash
# Añadir el remote (sustituye TU_USUARIO y NOMBRE_REPO por los tuyos)
git remote add origin https://github.com/TU_USUARIO/NOMBRE_REPO.git

# Subir la rama actual (por ejemplo main)
git checkout main
git add .
git status
git commit -m "chore: initial commit for Vercel + WhatsApp notifications"
git push -u origin main
```

Si prefieres subir la rama `demo-notificaciones`:

```bash
git add .
git commit -m "docs: add Vercel step-by-step and Firebase plans doc"
git push -u origin demo-notificaciones
```

Si te pide usuario/contraseña: en GitHub ya no se usa contraseña para push; usa un **Personal Access Token** como contraseña o configura SSH. En [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) puedes crear uno con permiso `repo`.

---

## Parte 2: Desplegar en Vercel

### 2.1 Crear proyecto en Vercel

1. Entra en [vercel.com](https://vercel.com) e inicia sesión (con GitHub si quieres).
2. **"Add New..."** → **"Project"**.
3. **Import Git Repository:** elige el repo que acabas de subir (ej. `TU_USUARIO/LP-Free`). Si no sale, "Configure GitHub" y autoriza a Vercel.
4. Configuración del proyecto:
   - **Framework Preset:** Vite (o deja que lo detecte).
   - **Root Directory:** `./` (raíz).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. **No hagas Deploy todavía.** Antes añade las variables de entorno.

### 2.2 Variables de entorno en Vercel

En la misma pantalla (o en **Project → Settings → Environment Variables**):

Añade estas variables (todas en **Production** y, si quieres, en Preview):

| Nombre | Valor | Dónde lo obtienes |
|--------|--------|-------------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Todo el contenido del JSON de la cuenta de servicio de Firebase | Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada |
| `WHATSAPP_ACCESS_TOKEN` | Token de acceso de la app de Meta (WhatsApp) | Meta for Developers → tu app → WhatsApp → API Setup |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID de WhatsApp | Mismo sitio, en WhatsApp → API Setup |
| `NOTIFY_CRON_SECRET` | Una contraseña aleatoria larga (solo tú y el cron la conocen) | Inventa una, ej. `a8f3k2m9x1...` |

Para `FIREBASE_SERVICE_ACCOUNT_JSON`: pega el JSON completo en una sola línea, o todo el contenido entre comillas si Vercel lo pide.

### 2.3 Desplegar

1. Clic en **"Deploy"**.
2. Espera a que termine el build. Si falla, revisa que el **Build Command** sea `npm run build` y que en el repo esté el `package.json` con las dependencias.
3. Cuando termine, tendrás una URL como:  
   `https://lp-free-xxxx.vercel.app`  
   La API quedará en:  
   `https://lp-free-xxxx.vercel.app/api/notify-orders`

### 2.4 Probar la API (opcional)

En el navegador o con curl (sustituye la URL y el secret):

```text
https://tu-proyecto.vercel.app/api/notify-orders?secret=TU_NOTIFY_CRON_SECRET
```

Si responde 200 y un JSON (aunque no haya pedidos), la API está bien. Si responde 401, el `secret` no coincide con `NOTIFY_CRON_SECRET`.

### 2.5 Variables en el frontend (para notificaciones al instante)

La app llama a la API cuando se crea un pedido o se actualiza el estado, así que las notificaciones llegan al momento (sin cron). Añade en tu `.env` local (y en Vercel como variables de entorno para el build) las mismas que usas en la API:

| Nombre | Valor |
|--------|--------|
| `VITE_NOTIFY_API_URL` | URL de tu API, ej. `https://tu-proyecto.vercel.app/api/notify-orders` |
| `VITE_NOTIFY_CRON_SECRET` | El mismo valor que `NOTIFY_CRON_SECRET` en Vercel |

En Vercel: Project → Settings → Environment Variables → añade estas dos para Production/Preview. Así el build tendrá la URL y el secret.

---

## Parte 3: Cron gratuito (opcional, solo como respaldo)

Si quieres un respaldo por si la llamada desde la app falla, puedes usar un cron:

1. Regístrate en [cron-job.org](https://cron-job.org).
2. **Create cronjob**:
   - **Title:** por ejemplo "Notificar pedidos Krocam".
   - **URL:**  
     `https://tu-proyecto.vercel.app/api/notify-orders?secret=TU_NOTIFY_CRON_SECRET`  
     (usa la misma URL y el mismo valor que `NOTIFY_CRON_SECRET` en Vercel).
   - **Schedule:** cada 5 o 10 minutos (según lo que quieras).
   - **Request Method:** GET (o POST si lo cambias en la API).
3. Guarda el cronjob. **No es obligatorio:** la app ya dispara la API al crear o actualizar pedidos, así que las notificaciones son inmediatas. El cron sirve solo como respaldo.

---

## Parte 4: WhatsApp (Meta) – resumen

Para que la API pueda enviar mensajes necesitas:

1. **Meta for Developers:** app con producto WhatsApp, token y Phone Number ID (ya usados en las variables de Vercel).
2. **Plantillas aprobadas:** en el código se usan `nuevo_pedido` (2 variables) y `estado_pedido` (1 variable). Créalas y apruebalas en Meta; si usas otros nombres, cambia los nombres en `api/notify-orders.ts`.

Detalle completo en **`docs/NOTIFICACIONES_GRATIS.md`**.

---

## Resumen del orden

1. Crear repo en GitHub (vacío).
2. `git remote add origin ...` y `git push` desde tu carpeta.
3. Vercel → Import repo → Añadir variables de entorno (incl. `VITE_NOTIFY_API_URL` y `VITE_NOTIFY_CRON_SECRET` para el frontend) → Deploy.
4. (Opcional) cron-job.org como respaldo.
5. Tener listas en Meta las plantillas de WhatsApp.

La app llama a la API al crear pedidos y al cambiar el estado, así que las notificaciones llegan al momento sin cron.
