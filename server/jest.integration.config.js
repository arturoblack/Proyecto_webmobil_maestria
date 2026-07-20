// Pruebas de integración: exigen un MongoDB con replica set (ver README)
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/integration/**/*.int.test.js"],
  // Las transacciones son más lentas que una prueba pura
  testTimeout: 20000,
  // Comparten una única base de datos: correrlas en paralelo las haría interferir
  maxWorkers: 1,
};
