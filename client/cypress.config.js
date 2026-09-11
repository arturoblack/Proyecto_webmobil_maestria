const { defineConfig } = require("cypress");

/**
 * Configuración mínima para la primera suite End-to-End (Guía 3, Actividad 3).
 *
 * baseUrl apunta al puerto 5180, que es el que declara vite.config.js con
 * strictPort, y no al 5173 por defecto de Vite: la documentación del proyecto
 * decía 5173 y con ese valor la suite entera fallaría al arrancar.
 *
 * Las credenciales NO viven aquí. Se leen de cypress.env.json (ignorado por git)
 * o de variables CYPRESS_*, para que ningún archivo versionado contenga una
 * contraseña, aunque sea la del seed de demostración.
 */
module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5180",
    supportFile: "cypress/support/e2e.js",
    specPattern: "cypress/e2e/**/*.cy.js",
    fixturesFolder: "cypress/fixtures",
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 800,
    env: {
      // La API vive en otro puerto: las interceptaciones necesitan su origen
      apiUrl: "http://localhost:5001",
    },
  },
});
