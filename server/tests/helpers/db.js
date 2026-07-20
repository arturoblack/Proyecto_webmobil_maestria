const mongoose = require("mongoose");

/**
 * Utilidades de conexión para las pruebas de integración.
 *
 * Usan una base de datos APARTE (librestock_test) para no tocar los datos de desarrollo,
 * y exigen un replica set: las transacciones del kardex no funcionan sin él.
 */

const TEST_URI =
  process.env.MONGO_URI_TEST || "mongodb://localhost:27017/librestock_test?replicaSet=rs0";

const connect = async () => {
  await mongoose.connect(TEST_URI);
  // Salvaguarda: un error de configuración no debe vaciar la base de desarrollo
  const dbName = mongoose.connection.name;
  if (!dbName.endsWith("_test")) {
    throw new Error(`Las pruebas exigen una base terminada en "_test", recibida: "${dbName}"`);
  }
};

const clear = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

module.exports = { connect, clear, disconnect, TEST_URI };
