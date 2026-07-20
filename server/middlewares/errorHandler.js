const ApiError = require("../utils/ApiError");

// Único punto de traducción de errores a respuestas HTTP con contrato uniforme { message }
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }
  // Errores de validación de Mongoose → 400 con el primer mensaje legible
  if (err.name === "ValidationError") {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ message: first.message });
  }
  // Violación de índice único (p. ej. SKU o username duplicado) → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ message: `El valor de "${field}" ya está registrado` });
  }
  // ObjectId malformado en la URL → 400
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Identificador no válido" });
  }
  console.error("Error no controlado:", err);
  return res.status(500).json({ message: "Error interno del servidor" });
};

module.exports = errorHandler;
