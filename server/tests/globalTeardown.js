/**
 * Cierre global de la suite: detiene el MongoDB efímero levantado en globalSetup.
 * Sin esto el proceso de Jest quedaría con el servidor vivo.
 */
module.exports = async () => {
  if (globalThis.__MONGO_REPLSET__) {
    await globalThis.__MONGO_REPLSET__.stop();
  }
};
