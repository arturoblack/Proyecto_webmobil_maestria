// Pruebas que necesitan base de datos: integración de servicios y API con Supertest.
// El MongoDB efímero con replica set lo levanta globalSetup una sola vez (Actividad 11).
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/integration/**/*.int.test.js", "**/tests/api/**/*.api.test.js"],
  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  // Las transacciones son más lentas que una prueba pura
  testTimeout: 30000,
  // Comparten una única base de datos: correrlas en paralelo las haría interferir
  maxWorkers: 1,
};
