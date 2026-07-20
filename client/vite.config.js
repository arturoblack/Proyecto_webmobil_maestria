import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // loadEnv (y no process.env) es lo que lee el archivo .env: sin esto la regla del
  // service worker apuntaría siempre a localhost, aun compilando contra otra API
  const env = loadEnv(mode, process.cwd(), "");
  const API_URL = env.VITE_API_URL || "http://localhost:5001";

  return {
    plugins: [
      react(),
      VitePWA({
        // autoUpdate: un shell viejo contra una API nueva produce fallos silenciosos
        registerType: "autoUpdate",
        includeAssets: ["apple-touch-icon.png"],
        manifest: {
          name: "LibreStock — gestión de stock y ventas",
          short_name: "LibreStock",
          description:
            "Gestión de stock, almacén y ventas para librerías y papelerías con múltiples sedes.",
          lang: "es-PE",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#ffffff",
          theme_color: "#1e3a5f",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            {
              src: "/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
          navigateFallback: "/index.html",
          // Si algún día la API queda bajo el mismo dominio, que el shell no la suplante
          navigateFallbackDenylist: [/^\/api\//],
          // El shell se precachea, pero los datos NO: nada de /api/* toca la caché.
          // Guardar respuestas autenticadas dejaría stock, ventas y usuarios legibles en
          // el dispositivo tras cerrar sesión, y en una tienda el equipo es compartido.
          runtimeCaching: [
            {
              urlPattern: new RegExp(`^${API_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`),
              handler: "NetworkOnly",
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: "CacheFirst",
              options: {
                cacheName: "librestock-fuentes",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        // En desarrollo el service worker queda apagado: cachear durante el desarrollo
        // genera confusiones difíciles de diagnosticar
        devOptions: { enabled: false },
      }),
    ],
    server: {
      // Puerto propio: el 5173 por defecto lo ocupan otros proyectos del equipo.
      // strictPort evita el fallo silencioso de quedarse en otro puerto (o en otra
      // familia de direcciones) y creer que se está viendo esta aplicación.
      port: 5180,
      strictPort: true,
      host: "127.0.0.1",
    },
  };
});
