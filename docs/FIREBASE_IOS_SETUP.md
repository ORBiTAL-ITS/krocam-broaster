# Firebase en iOS - GoogleService-Info.plist

La app iOS requiere el archivo `GoogleService-Info.plist` para que Firebase funcione. Sin él, la app se cierra con pantalla negra.

## Pasos

### 1. Añadir la app iOS en Firebase (si aún no lo has hecho)

1. Entra en [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Haz clic en el icono de engranaje → **Configuración del proyecto**
4. En **Tus apps**, haz clic en **Añadir app** → **iOS**
5. Indica el **ID del paquete**: `com.orbitalits.krocambroaster`
6. El resto puedes dejarlo vacío por ahora
7. Haz clic en **Registrar app**

### 2. Descargar GoogleService-Info.plist

1. Tras registrar la app iOS, descarga **GoogleService-Info.plist**
2. Guárdalo en tu Mac (por ejemplo en Descargas)

### 3. Añadirlo al proyecto Xcode

1. Abre el proyecto: `npx cap open ios`
2. En el **navegador de proyecto** (panel izquierdo), haz clic derecho sobre la carpeta **App**
3. **Add Files to "App"…**
4. Selecciona el archivo `GoogleService-Info.plist`
5. Marca **Copy items if needed**
6. Marca el target **App**
7. Pulsa **Add**

### 4. Verificar

1. En Xcode, comprueba que `GoogleService-Info.plist` aparece en la carpeta App
2. Selecciona el archivo y en el panel derecho, en **Target Membership**, confirma que **App** está marcado
3. Vuelve a compilar y ejecutar la app

---

**Nota:** El archivo `GoogleService-Info.plist` contiene configuraciones de tu proyecto Firebase. No hace falta subirlo a un repositorio público si prefieres; puedes añadirlo a `.gitignore` y documentar que cada desarrollador debe descargar su propia copia desde Firebase Console.
