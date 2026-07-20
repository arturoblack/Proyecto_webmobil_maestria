// Error de aplicación con código HTTP; el middleware de errores lo traduce a la respuesta
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }

  static badRequest(message) {
    return new ApiError(400, message);
  }
  static unauthorized(message = "Sesión no válida o expirada") {
    return new ApiError(401, message);
  }
  static forbidden(message = "No tienes permiso para esta operación") {
    return new ApiError(403, message);
  }
  static notFound(message = "Recurso no encontrado") {
    return new ApiError(404, message);
  }
  static conflict(message) {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
