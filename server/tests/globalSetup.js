const { MongoMemoryReplSet } = require("mongodb-memory-server");

/**
 * Arranque global de la suite que necesita base de datos (Guía 2, Actividad 11).
 *
 * El servidor efímero se levanta UNA vez para toda la ejecución y fuera del
 * sandbox de módulos de Jest: dentro de él, el controlador de MongoDB falla al
 * construir los metadatos del cliente. Publica la URI en MONGO_URI_TEST para que
 * el helper de conexión la encuentre.
 *
 * Exige replica set porque las transacciones del kardex no funcionan sin él, y
 * son precisamente lo que estas pruebas verifican.
 */
module.exports = async () => {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGO_URI_TEST = replSet.getUri();
  // La API firma y verifica tokens: sin secreto, toda ruta autenticada fallaría
  process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto-solo-para-pruebas";
  // Se guarda en el ámbito global para que el teardown pueda detenerlo
  globalThis.__MONGO_REPLSET__ = replSet;
};
