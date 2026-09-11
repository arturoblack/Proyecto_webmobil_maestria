import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Configuración de pruebas del cliente, separada de vite.config.js a propósito:
 * vite.config.js registra el plugin de PWA, que genera un service worker en cada
 * arranque y no pinta nada en un entorno de pruebas.
 *
 * El equivalente del perfil unitario del back-end: reglas puras, hooks y
 * componentes, sin navegador real y sin tocar la API.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["lcov", "text-summary"],
      include: ["src/**/*.{js,jsx}"],
      // Se excluye lo que no contiene lógica verificable: el punto de entrada,
      // la definición de rutas y los componentes puramente presentacionales.
      exclude: ["src/main.jsx", "src/App.jsx", "src/components/Ui.jsx"],
    },
  },
});
