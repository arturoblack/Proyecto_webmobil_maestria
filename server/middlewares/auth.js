const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

// Verifica el token JWT de la cabecera Authorization y expone req.user
const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Acceso denegado: falta el token"));
  }
  try {
    req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    return next();
  } catch {
    return next(ApiError.unauthorized());
  }
};

// Restringe la ruta a usuarios con rol de administrador
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return next(ApiError.forbidden("Se requiere permiso de administrador"));
  }
  return next();
};

module.exports = { verifyToken, requireAdmin };
