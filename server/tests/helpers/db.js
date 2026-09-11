const mongoose = require("mongoose");

/**
 * Utilidades de conexión para las pruebas que necesitan base de datos.
 *
 * Estrategia de aislamiento (Guía 2, Actividad 11): la suite corre contra un
 * MongoDB efímero en memoria CON replica set, levantado una sola vez en
 * tests/globalSetup.js. Ese servidor vive y muere con la ejecución, así que
 * ninguna prueba puede tocar datos reales ni exige credenciales de Atlas.
 *
 * Definiendo MONGO_URI_TEST antes de ejecutar se puede apuntar a otra base
 * —por ejemplo librestock_test en Atlas— sin cambiar una línea de las pruebas.
 */

const DB_NAME = "librestock_test";

const connect = async () => {
  const uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    throw new Error("Falta MONGO_URI_TEST: ejecuta la suite con jest.integration.config.js");
  }
  await mongoose.connect(uri, { dbName: DB_NAME });

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
  // Se vacían las colecciones en vez de soltar la base: el usuario de aplicación de Atlas
  // tiene permiso de lectura/escritura, pero no "dropDatabase" (eso exige rol de dbAdmin).
  await clear();
  await mongoose.disconnect();
};

module.exports = { connect, clear, disconnect, DB_NAME };
