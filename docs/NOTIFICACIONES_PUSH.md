# Notificaciones push (web y app Android)

En **navegador** se usa el Service Worker y la clave VAPID. En la **app Android (APK)** se usa el plugin nativo `@capacitor-firebase/messaging`; para que funcione hace falta `google-services.json`.

## App Android: google-services.json (obligatorio)

Sin este archivo las push **no funcionan** en la APK.

1. [Firebase Console](https://console.firebase.google.com/) → tu proyecto → **Configuración del proyecto** (engranaje).
2. En **Tus apps**, selecciona la app **Android** (package `com.krocam.broaster.samir`) o créala.
3. Descarga **google-services.json** y colócalo en:
   ```
   android/app/google-services.json
   ```
4. Vuelve a sincronizar y generar la APK: `npm run cap:sync` y luego compilar en Android Studio.

(Opcional) Para que el icono de la notificación en la barra de estado no sea un cuadrado blanco, puedes añadir un icono de notificación (blanco sobre transparente) y referenciarlo en `android/app/src/main/AndroidManifest.xml` con el meta-data `com.google.firebase.messaging.default_notification_icon`. Si no lo añades, FCM usará el icono de la app.

---

## 1. Firebase Console (web y VAPID)

1. **Cloud Messaging**  
   - Ve a **Configuración del proyecto** (engranaje) > **Cloud Messaging**.  
   - En **Certificados de push web**, genera un par de claves (o usa el que aparece).  
   - Copia la **Clave pública** (VAPID).

2. **Variable de entorno**  
   - En el `.env` del proyecto (junto a las demás `VITE_FIREBASE_*`) agrega:
   ```env
   VITE_FIREBASE_VAPID_KEY=tu_clave_publica_vapid_aqui
   ```

3. **Service worker**  
   - Abre `public/firebase-messaging-sw.js`.  
   - Sustituye el objeto `firebaseConfig` por la configuración de tu proyecto (misma que en Firebase Console > Configuración del proyecto > Tus apps).

## 2. Despliegue de Cloud Functions

Para que se envíen las notificaciones al crear o actualizar pedidos:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

(Necesitas tener configurado Firebase CLI y el proyecto: `firebase use tu-project-id`.)

## 3. Comportamiento

- **Al iniciar sesión** la app pide permiso de notificaciones; si el usuario acepta, se guarda el token en `users/{uid}.fcmTokens`.
- **Nuevo pedido** → los usuarios con `role === 'admin'` reciben una notificación.
- **Cambio de estado del pedido** → el cliente dueño del pedido recibe una notificación.

Funciona en **navegador** (Service Worker + VAPID) y en la **app Android** (plugin nativo FCM), usando las mismas Cloud Functions. En Android el token se obtiene con el plugin y se guarda en el mismo campo `fcmTokens` en Firestore.
