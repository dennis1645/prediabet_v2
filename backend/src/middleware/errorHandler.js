export function errorHandler(err, req, res, next) {
  console.error("Backend Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Terjadi kesalahan internal pada server.";

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}
