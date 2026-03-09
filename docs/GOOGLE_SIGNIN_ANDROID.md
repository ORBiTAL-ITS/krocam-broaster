# Inicio con Google en la app Android (APK)

En la app Android no se usa el flujo web (redirect), que provoca el error *"Unable to process request due to missing initial state"*. Se usa el **plugin nativo** de Google Sign-In y luego Firebase con la credencial.

## Error "Something went wrong" o código 10 (DEVELOPER_ERROR)

Si al pulsar "Continuar con Google" sale **"Something went wrong"** o en consola **code 10**, Google no reconoce tu app: **falta registrar la huella SHA-1** en Firebase y en Google Cloud. Sigue la sección **"Si sale Something went wrong"** más abajo (obtener SHA-1, añadirlo en Firebase, crear cliente Android en Google Cloud con ese SHA-1 y package `com.krocam.broaster.samir`). Sin eso, el inicio con Google en la APK no funcionará.

## Qué tienes que configurar

### 1. Web Client ID de Google

Necesitas el **Web Client ID** de tu proyecto en Google Cloud (el mismo que usa Firebase para “Iniciar con Google” en web):

1. Entra en [Google Cloud Console](https://console.cloud.google.com/) y selecciona el proyecto de Firebase.
2. **APIs & Services → Credentials**.
3. En **OAuth 2.0 Client IDs** localiza el cliente de tipo **Web client** (o créalo si no existe).
4. Copia el **Client ID** (algo como `123456789012-xxxx.apps.googleusercontent.com`).

### 2. Poner el Web Client ID en la app Android

**Opción A – En `strings.xml` (recomendado):**

Edita `android/app/src/main/res/values/strings.xml` y sustituye el valor de `server_client_id` por tu Web Client ID completo:

```xml
<string name="server_client_id">TU_CLIENT_ID_REAL.apps.googleusercontent.com</string>
```

**Opción B – Variable de entorno al sincronizar:**

Si quieres que `capacitor.config` use el ID, define la variable antes de sincronizar:

```bash
export VITE_GOOGLE_WEB_CLIENT_ID=TU_CLIENT_ID_REAL.apps.googleusercontent.com
npm run cap:sync
```

Y en `strings.xml` también debe estar el mismo valor (el plugin en Android puede leer de ambos sitios).

### 3. Firebase y Google Cloud

- La app Android debe estar dada de alta en **Firebase Console** (mismo proyecto) con el package `com.krocam.broaster.samir`.
- En **Google Cloud → Credentials** debe existir un **OAuth 2.0 Client ID de tipo Android** con ese package y el SHA-1 de tu keystore (debug o release). Así el token que devuelve el plugin nativo será válido para Firebase.

Si solo tienes el Web client, créalo; para Android también conviene tener el cliente Android con el SHA-1 para que no falle la verificación.

### 4. Recompilar la app

Después de cambiar `strings.xml` o la variable de entorno:

```bash
npm run cap:sync
```

Luego abre el proyecto en Android Studio y genera de nuevo el APK.

## Si sale "Something went wrong"

Ese mensaje suele aparecer cuando **Google no reconoce tu app** porque falta la **huella SHA-1** del APK. Hay que registrarla en dos sitios.

### 1. Obtener el SHA-1 (debug)

En tu Mac, en la terminal:

```bash
cd android
./gradlew signingReport
```

En la salida busca **Variant: debug** y copia el **SHA1** (ej: `AA:BB:CC:...`).

O con keytool (keystore por defecto de debug):

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copia el valor **SHA1**.

### 2. Añadir SHA-1 en Firebase

1. [Firebase Console](https://console.firebase.google.com/) → tu proyecto → **Project settings** (engranaje).
2. En **Your apps** selecciona la app Android (`com.krocam.broaster.samir`) o créala si no existe.
3. Pulsa **Add fingerprint**, pega el SHA-1 y guarda.

### 3. Crear o actualizar el cliente Android en Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com/) → mismo proyecto → **APIs & Services → Credentials**.
2. Si no hay un **OAuth 2.0 Client ID** de tipo **Android**:
   - **Create Credentials → OAuth client ID**.
   - Application type: **Android**.
   - Nombre: p. ej. "Krocam Android".
   - Package name: `com.krocam.broaster.samir`.
   - **SHA-1 certificate fingerprint**: pega el mismo SHA-1 que en Firebase.
3. Crear. No necesitas copiar el Client ID en la app; el plugin usa el Web Client ID. Lo importante es que exista este cliente Android con package + SHA-1.

### 4. Volver a probar

Genera de nuevo el APK e instálalo. "Iniciar con Google" debería dejar de mostrar "Something went wrong".

---

## Resumen del flujo

- **Web:** Se usa `signInWithPopup` y, si el navegador lo bloquea, `signInWithRedirect`.
- **App Android (APK):** Se usa el plugin `@codetrix-studio/capacitor-google-auth` → el usuario inicia sesión con la cuenta de Google en el flujo nativo → el plugin devuelve `idToken` (y opcionalmente `accessToken`) → la app llama a `signInWithCredential(auth, GoogleAuthProvider.credential(idToken, accessToken))`. No hay redirect ni uso de `sessionStorage`, por eso desaparece el error *"missing initial state"*.
