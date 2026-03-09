# Notificaciones gratuitas (sin plan Blaze): WhatsApp

Para no usar **Firebase Cloud Functions** (que exigen plan Blaze), puedes enviar notificaciones por **WhatsApp** con la **API de Meta**: **1.000 conversaciones al mes gratis**.

## Cómo funciona

1. Un **cron externo** (por ejemplo [cron-job.org](https://cron-job.org), gratuito) llama cada X minutos a una **API tuya**.
2. Esa API (desplegada en **Vercel** u otro host gratuito) **lee Firestore** (Firebase Admin SDK; no requiere Blaze) y detecta pedidos nuevos o cambios de estado.
3. La misma API envía mensajes por **WhatsApp Cloud API** (plantilla aprobada por Meta) a admins o al cliente.

Todo puede ser **gratis**: Vercel (hobby), Firestore (cuota gratuita), cron-job.org, WhatsApp (1.000 conversaciones/mes).

---

## 1. Meta / WhatsApp Business

1. Entra en [Meta for Developers](https://developers.facebook.com/) y crea una app (tipo **Business**).
2. Añade el producto **WhatsApp** y configura un número de teléfono (o usa el de prueba).
3. Obtén:
   - **Token de acceso** (temporal o permanente según tu caso).
   - **Phone Number ID** (ID del número que envía).
4. Crea y **aprueba una plantilla** de mensaje (por ejemplo “Notificación de pedido”) para notificaciones de tipo *utility*. El código de `api/notify-orders.ts` espera dos plantillas (cambia los nombres en el código si usas otras): **`nuevo_pedido`** (2 variables: ref y total) y **`estado_pedido`** (1 variable: estado). Sin plantillas aprobadas no podrás enviar mensajes.

Documentación: [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api).

---

## 2. Cuenta de servicio de Firebase (sin Blaze)

1. [Firebase Console](https://console.firebase.google.com/) → tu proyecto → **Configuración del proyecto** → pestaña **Cuentas de servicio**.
2. **Generar nueva clave privada** y descarga el JSON.
3. El contenido de ese JSON lo usarás como variable de entorno en Vercel (por ejemplo `FIREBASE_SERVICE_ACCOUNT_JSON`).

No necesitas activar el plan Blaze para esto.

---

## 3. API en Vercel (este proyecto)

En el repo está **`api/notify-orders.ts`** (endpoint en Vercel: `/api/notify-orders`) que:

- Recibe una llamada HTTP (con un **secret** en query o header para que solo el cron la ejecute).
- Usa **Firebase Admin** para leer pedidos recientes en Firestore.
- Marca pedidos ya notificados (para no enviar dos veces).
- Llama a la **WhatsApp Cloud API** para enviar la plantilla a admins (pedido nuevo) o al cliente (cambio de estado).

Despliegue en Vercel:

```bash
# En la raíz del proyecto
npm i -g vercel
vercel
```

En **Vercel → Project → Settings → Environment Variables** configura:

- `FIREBASE_SERVICE_ACCOUNT_JSON` = contenido del JSON de la cuenta de servicio (o las variables que use tu código).
- `WHATSAPP_ACCESS_TOKEN` = token de la app de Meta.
- `WHATSAPP_PHONE_NUMBER_ID` = Phone Number ID de WhatsApp.
- `NOTIFY_CRON_SECRET` = una contraseña que solo uses en el cron (ej. una string aleatoria).

---

## 4. Cron gratuito (cron-job.org)

1. Regístrate en [cron-job.org](https://cron-job.org).
2. Crea un cron que cada **5** o **10** minutos haga una petición **GET** o **POST** a tu API en Vercel, por ejemplo:
   `https://tu-proyecto.vercel.app/api/notify-orders?secret=NOTIFY_CRON_SECRET`
3. Usa el mismo valor de `NOTIFY_CRON_SECRET` que en Vercel para que la API acepte la llamada.

Así, sin Cloud Functions ni plan Blaze, tendrás notificaciones por WhatsApp cuando haya pedidos nuevos o cambios de estado, usando solo opciones gratuitas (Vercel, Firestore, cron-job.org y la cuota gratuita de WhatsApp).
