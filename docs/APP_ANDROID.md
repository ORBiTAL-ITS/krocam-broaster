# App Android — Krocam Broaster Samir

La app Android se genera con **Capacitor** a partir del mismo código web (React + Ionic + Vite).

## Nombre e icono

- **Nombre en el launcher:** «Krocam Broaster Samir»
- **Icono:** Logo de Krocam (pollo en escudo amarillo) en todas las densidades.
- **Fondo del icono adaptativo:** Amarillo marca (#FFC300).

## "Módulo app no definido" o "Configuration is still incorrect"

**Causa:** Android Studio tiene que abrir la **carpeta `android`**, no la raíz del proyecto (LP-Free). Si abres la raíz, el módulo `app` no existe para el IDE.

**Solución:**

1. Cierra el proyecto en Android Studio (**File → Close Project**).
2. **File → Open** (o "Open" en la pantalla de bienvenida).
3. Navega hasta **LP-Free** y selecciona **solo la carpeta `android`** (la que contiene `build.gradle`, `settings.gradle` y la carpeta `app`). Pulsa **Open**.
4. Espera a que termine **Sync Project with Gradle Files** (barra de progreso abajo).
5. **Run → Edit Configurations…** → **+** → **Android App**.
6. **Name:** `app`. En **Module** debe aparecer ahora **`android.app`** o **`app`** en el desplegable; elige ese módulo.
7. **OK**. Arriba selecciona un dispositivo o emulador y pulsa **Run** (▶️).

Si tras abrir la carpeta `android` el desplegable **Module** sigue vacío, haz **File → Invalidate Caches → Invalidate and Restart**. Si sigue fallando, revisa **File → Project Structure → SDK Location** (JDK y Android SDK correctos).

**Ver el error real (recomendado):** Cuando salga "Configuration is still incorrect", pulsa **Edit**. En **Edit Configurations** selecciona **app** y **abre la sección "Before launch"** (triángulo para desplegar). Ahí aparece el motivo concreto (p. ej. "Default Activity not found", "Module not specified"). Corrige eso: **Module** = android.app, **Launch** = Specified Activity → `com.krocam.broaster.samir.MainActivity`, o **Gradle JDK** según lo que indique.

### "Module not specified"

Si al darle a **Run** sale **Module not specified**:

1. **Run → Edit Configurations…**
2. Selecciona la configuración **app** (o créala con **+** → **Android App**).
3. En **Module**, abre el desplegable y elige el módulo de la app. Suele aparecer como **`app`** o **`android.app`** (el que tenga el icono de app/android).
4. **Apply** → **OK**.

Si en **Module** no sale ninguna opción: **File → Sync Project with Gradle Files**, espera a que termine y vuelve a **Edit Configurations**; el módulo debería aparecer.

### "No JDK specified for module 'android.app'"

El proyecto debe usar un JDK (Java 17 o 21 recomendado). En el proyecto ya está configurado **jbr-21** para Gradle. Si sigue el error:

1. **File → Project Structure** (o **Settings → Build, Execution, Deployment → Build Tools → Gradle**).
2. En **Gradle**: en **Gradle JDK** elige un JDK (por ejemplo **jbr-21**, **jbr-17** o **17**). Si no hay ninguno, descarga uno con el desplegable **Download JDK**.
3. En **Project Structure → Project**: en **SDK** elige el mismo (por ejemplo **Android API 36** o el que uses; el **Project SDK** puede ser el mismo JDK).
4. **Apply** → **OK**. Luego **File → Sync Project with Gradle Files**.

## Requisitos

- **Node.js** (ya usado en el proyecto)
- **Java JDK 17** (recomendado para Android)
- **Android Studio** (para abrir el proyecto nativo y generar el APK/AAB)
- **Android SDK** instalado vía Android Studio

## Comandos útiles

```bash
# Build web y sincronizar con Android
npm run cap:sync

# Abrir proyecto en Android Studio (para compilar e instalar en dispositivo/emulador)
npm run android

# Build, sincronizar y ejecutar en dispositivo/emulador conectado
npm run android:run
```

## Cómo sacar el APK

1. Sincronizar el proyecto (por si cambiaste código web):
   ```bash
   npm run cap:sync
   ```
2. Abrir el proyecto en Android Studio:
   ```bash
   npm run android
   ```
3. En Android Studio: menú **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. Cuando termine, haz clic en **Locate** en la notificación (o ve tú a la carpeta).

**Dónde está el APK:**

| Tipo   | Ruta |
|--------|------|
| Debug  | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Release| `android/app/build/outputs/apk/release/` (tras firmar) |

Ese `app-debug.apk` puedes copiarlo al móvil (USB, correo, Drive, etc.) e instalarlo.

**Requisito:** tener **Java JDK** y **Android Studio** instalados; sin ellos la compilación no se puede hacer desde la terminal.

Para publicar en Google Play se usa un **Android App Bundle (AAB)**:

- **Build → Generate Signed Bundle / APK** → elegir **Android App Bundle** y configurar keystore.

## Estructura relevante

- `capacitor.config.ts`: configuración de Capacitor (appId, appName, webDir).
- `android/`: proyecto nativo Android.
- `android/app/src/main/res/values/strings.xml`: nombre de la app.
- `android/app/src/main/res/mipmap-*`: iconos de la app (logo en todas las densidades).
- `resources/icon.png`: imagen fuente del logo (para regenerar iconos si se cambia).

## Regenerar iconos

Si cambias el logo y quieres regenerar los iconos de Android:

1. Sustituye `resources/icon.png` por tu imagen (recomendado 1024×1024 px).
2. Instala y ejecuta (requiere Java/entorno completo):

   ```bash
   npm install @capacitor/assets --save-dev
   npx @capacitor/assets generate
   ```

   O copia manualmente el nuevo logo a cada carpeta `android/app/src/main/res/mipmap-*` como `ic_launcher.png`, `ic_launcher_foreground.png` e `ic_launcher_round.png`.
