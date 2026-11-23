// Error con código HTTP: los servicios lo lanzan y los controladores lo responden.
class HttpError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

// Traduce errores propios, de Mongoose/MongoDB y de Prisma a una respuesta HTTP.
const sendError = (res, error) => {
  if (error instanceof HttpError) {
    const body = { error: error.message };
    if (error.errors) body.errors = error.errors;
    return res.status(error.statusCode).json(body);
  }
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ error: "Datos inválidos", errors });
  }
  if (error.name === "CastError") {
    return res
      .status(400)
      .json({ error: `Valor inválido para ${error.path}: ${error.value}` });
  }
  if (error.code === 11000) {
    const fields = Object.keys(error.keyValue || error.keyPattern || {});
    return res.status(409).json({
      error: `Ya existe un registro con el mismo valor en: ${fields.join(", ")}`,
    });
  }
  if (error.code === "P2002") {
    return res
      .status(409)
      .json({ error: "Ya existe una consulta para esa mascota en esa fecha" });
  }
  console.error(error);
  return res.status(500).json({ error: "Error interno del servidor" });
};

module.exports = { HttpError, sendError };
