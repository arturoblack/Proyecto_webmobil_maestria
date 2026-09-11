const ApiError = require("./ApiError");

/**
 * Corta la petición con 404 cuando una consulta no encontró el documento.
 *
 * Mongoose devuelve null en lugar de lanzar, así que sin este guardián el
 * controlador responde 200 con cuerpo vacío y el cliente cree que la operación
 * se aplicó. Devolver el documento permite encadenar la comprobación con el uso.
 */
const assertFound = (document, message) => {
  if (!document) throw ApiError.notFound(message);
  return document;
};

module.exports = assertFound;
