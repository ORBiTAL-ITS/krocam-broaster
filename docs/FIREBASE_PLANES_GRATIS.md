# Firebase: planes y uso 100 % gratuito (sin tarjeta)

## Qué planes existen **ahora mismo**

En Firebase solo hay **dos planes**:

| Plan    | Nombre en la consola | ¿Pide tarjeta? | ¿Es gratis? |
|--------|-----------------------|-----------------|-------------|
| **Spark** | "Plan Spark" / Free  | **No**          | Sí. Cuotas gratuitas de Firestore, Auth, Hosting, etc. |
| **Blaze** | "Plan Blaze" / Pay as you go | **Sí** (cuenta de facturación) | Tienes cuota gratis, pero si te pasas se cobra. Solo por tener Blaze ya te pide vincular tarjeta. |

No hay otro plan “gratis con Functions”. Las **Cloud Functions solo se pueden desplegar en Blaze**, y Blaze siempre pide añadir una cuenta de facturación (tarjeta).

---

## Por qué te pide “cuenta” o “facturación”

- Si intentas **desplegar Cloud Functions** (`firebase deploy --only functions`), Firebase/Google Cloud te pedirá **subir al plan Blaze** y, con él, **añadir una tarjeta**. Eso es así por diseño: Functions no están disponibles en el plan gratuito.
- Aunque en Blaze hay **uso gratis** de Functions, Google igualmente exige tener **método de pago** asociado al proyecto.

Por eso, si **no quieres poner tarjeta**, no debes cambiar a Blaze ni intentar desplegar Functions.

---

## Cómo usar Firebase 100 % gratis (sin tarjeta)

1. **Quédate en el plan Spark**  
   No hagas “Upgrade” / “Cambiar a Blaze”. No vincule facturación al proyecto.

2. **No desplegues Cloud Functions**  
   No ejecutes `firebase deploy --only functions`. Con Spark no se puede y te llevará a la pantalla de facturación.

3. **Lo que sí puedes usar en Spark (sin tarjeta):**
   - Authentication (incl. Google)
   - Firestore (dentro de la cuota gratuita)
   - Hosting
   - FCM para push (en la app)
   - Storage (cuota gratuita)

4. **Para notificaciones de pedidos** (sin Blaze y sin tarjeta):  
   Usa la opción con **WhatsApp + API en Vercel + cron**, tal como está en **`docs/NOTIFICACIONES_GRATIS.md`**. Esa ruta no usa Cloud Functions ni plan Blaze.

---

## Si la consola “no deja” o te pide cambiar de plan

- **“Upgrade to Blaze” / “Añadir cuenta de facturación”**  
  No aceptes. Cierra esa pantalla. Tu proyecto puede seguir en Spark.

- **“No se puede desplegar Functions”**  
  Es normal en Spark. La solución no es subir a Blaze si no quieres tarjeta; la solución es usar la API de notificaciones en Vercel (WhatsApp) como en `NOTIFICACIONES_GRATIS.md`.

- **Comprobar en qué plan estás**  
  Firebase Console → ⚙️ **Configuración del proyecto** → pestaña **Uso y facturación**. Ahí dice si estás en **Spark** o **Blaze**. Si estás en Spark, no deberías tener ninguna cuenta de facturación vinculada.

---

## Resumen

- **Plan que existe y es gratis sin tarjeta:** **Spark**.
- **Plan que pide tarjeta:** **Blaze** (necesario solo para Cloud Functions).
- **Recomendación:** Mantente en **Spark**, no añadas facturación, y usa **WhatsApp + Vercel + cron** para las notificaciones en lugar de Functions.
