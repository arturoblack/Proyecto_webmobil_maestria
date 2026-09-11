// Pruebas unitarias: reglas puras, sin base de datos.
// Las que necesitan MongoDB (integración y API con Supertest) corren con
// jest.integration.config.js, que levanta un servidor efímero con replica set.
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/integration/", "/tests/api/"],
};
