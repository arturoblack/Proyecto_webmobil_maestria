# Despliegue de LibreStock (gratuito)

Pila: **MongoDB Atlas** (base) + **Render** (API) + **Vercel** (SPA). Las tres capas dan
HTTPS, requisito para instalar la PWA. Todo en plan gratuito.

El orden importa: primero la base, luego la API (necesita la base), al final la SPA
(necesita la URL de la API).

---

## 1. Base de datos — MongoDB Atlas (M0, gratis)

Las transacciones del kardex exigen un replica set; Atlas lo provee de fábrica, incluso en M0.

1. Crear cuenta en <https://www.mongodb.com/atlas> y un clúster **M0** (gratis).
2. **Database Access** → crear un usuario con contraseña (rol *Read and write to any database*).
3. **Network Access** → *Add IP Address* → **`0.0.0.0/0`**.
   Render usa IPs dinámicas en el plan free: sin esto, la API no conecta.
4. **Connect** → *Drivers* → copiar la cadena `mongodb+srv://...`. Reemplazar `<password>` y
   añadir el nombre de base: `.../librestock?retryWrites=true&w=majority`.

### Poblar la base (una sola vez)

El seed limpia y recrea datos de demostración; se corre **manualmente**, nunca en cada deploy:

```bash
cd server
MONGO_URI="mongodb+srv://.../librestock?retryWrites=true&w=majority" npm run seed
```

Crea `admin/admin123`, `rosa/rosa123`, dos sedes y 10 productos con stock.

---

## 2. API — Render (Web Service, gratis)

El repo incluye `render.yaml`: Render lo lee y configura el servicio solo.

1. En <https://render.com> → *New* → **Blueprint** → conectar el repositorio de GitHub.
2. Render detecta `render.yaml` y propone el servicio `librestock-api`. Confirmar.
3. Pegar la variable **`MONGO_URI`** (la cadena de Atlas). `JWT_SECRET` lo genera Render solo;
   `PORT` lo inyecta Render.
4. Deploy. Al terminar, la URL es `https://librestock-api.onrender.com` (o similar).
5. Verificar: abrir `.../api/health` → debe responder `{"status":"ok"}`.

> **Cold start.** El plan free duerme el servicio tras ~15 min de inactividad; el primer
> request tarda ~50 s en despertar. **Antes de grabar el video pitch**, abrir `/api/health`
> y esperar el `ok`: eso lo mantiene despierto durante la demo.

---

## 3. SPA — Vercel (Hobby, gratis)

1. En <https://vercel.com> → *Add New* → *Project* → importar el mismo repositorio.
2. **Root Directory: `client`** (el repo es monorepo; la SPA está en `client/`).
   Vercel detecta Vite y usa `npm run build` → `dist/` automáticamente.
3. **Environment Variables** → añadir **`VITE_API_URL`** = la URL de Render del paso 2.
   Vite incrusta esta variable **en el build**: si cambia la URL de la API, hay que redesplegar.
4. Deploy. La SPA queda en `https://<proyecto>.vercel.app`, ya instalable como PWA.

El `client/vercel.json` reescribe cualquier ruta a `index.html`: sin eso, recargar una URL
como `/inventario` daría 404.

---

## Checklist final

- [ ] `/api/health` responde `ok` (API viva y conectada a Atlas)
- [ ] Login en la SPA con `admin/admin123` funciona (SPA ↔ API ↔ base)
- [ ] Una venta descuenta stock y aparece en el kardex (transacciones OK en Atlas)
- [ ] La SPA ofrece "Instalar aplicación" en el móvil (PWA + HTTPS)
- [ ] Pegar las URLs finales en la sección 5.4 de la memoria técnica
