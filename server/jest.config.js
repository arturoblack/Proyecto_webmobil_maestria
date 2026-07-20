// Pruebas unitarias: reglas puras, sin base de datos (ver jest.integration.config.js)
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/tests/integration/"],
};
