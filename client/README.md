# LibreStock — SPA (front-end)

React 18 + Vite + Bootstrap 5 + react-router. Guía de estilo "vidrio de papelería"
(sección 4.3 de la memoria técnica) implementada como tokens CSS.

## Puesta en marcha

```bash
cp .env.example .env     # VITE_API_URL apuntando a la API (local: http://localhost:5001)
npm install
npm run dev              # http://127.0.0.1:5180
```

El puerto es fijo (`5180`) y `strictPort` está activo: el 5173 por defecto suele estar
ocupado por otros proyectos, y Vite se cambiaba de puerto en silencio.

## Estructura (estándares 5.1)

```
src/api/client.js    ÚNICA instancia Axios: token + manejo de 401 en interceptores
src/context/         AuthContext: único estado global (usuario, rol, login/logout)
src/hooks/useApi.js  Fetching uniforme: { data, loading, error, refresh }
src/components/      UI compartida (Ui.jsx), layout adaptativo (AppLayout), rutas protegidas
src/pages/           Una página por pantalla de la Tabla 7 (10 pantallas)
src/styles/tokens.css  Paleta, vidrio (.glass), trazo resaltador (.hl), navegación
```

## Reglas rápidas

- Vidrio en superficies, sólido en acciones (`.btn-ink`). Máx 3–4 `.glass` por pantalla.
- Mobile-first; breakpoint 992px: barra inferior ↔ menú lateral.
- El front no decide negocio: valida forma, el servidor valida verdad (stock, precios, roles).
- Componentes ≤ ~150 líneas. Sin axios directo fuera de `api/client.js`.

## PWA (aplicación instalable)

LibreStock se instala en el móvil como aplicación: icono propio, pantalla completa sin barra
de navegador y arranque inmediato. Se configura en `vite.config.js` con `vite-plugin-pwa`.

**Instalable, pero NO offline.** Es una distinción deliberada, no una limitación pendiente:
el stock se valida siempre en el servidor dentro de una transacción, así que aceptar ventas
sin conexión permitiría vender existencias que ya no están. Sin red, `OfflineNotice` avisa
en vez de aparentar que la aplicación funciona.

Decisiones de la configuración:

- **`/api/*` en `NetworkOnly`**: los datos nunca se guardan en caché. Cachear respuestas
  autenticadas dejaría stock, ventas y usuarios legibles en el dispositivo tras cerrar
  sesión, y en una tienda el equipo es compartido.
- **`registerType: "autoUpdate"`**: un shell viejo contra una API actualizada produce
  fallos silenciosos difíciles de diagnosticar.
- **Service worker apagado en desarrollo** (`devOptions.enabled: false`).

Los iconos de `public/` usan la paleta aprobada (tinta `#1E3A5F` y trazo resaltador ámbar
`#F59E0B`). Se requiere HTTPS para instalar: Vercel lo provee; en local sirve `127.0.0.1`.

```bash
npm run build && npm run preview   # el service worker solo existe en el build
```

Ver [`../CLAUDE.md`](../CLAUDE.md) para el contexto completo del proyecto.
