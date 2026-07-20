// Canaliza cualquier excepción de un controlador asíncrono hacia el middleware de errores
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
