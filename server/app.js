const express = require("express");
const cors = require("cors");

const errorHandler = require("./middlewares/errorHandler");

/**
 * Construye la aplicación de Express ya configurada, sin abrir la conexión a la
 * base de datos ni escuchar en ningún puerto.
 *
 * Esa separación es lo que permite montar la API desde una prueba con Supertest:
 * si el arranque viviera aquí, importar este módulo levantaría el puerto 5001 y
 * conectaría a Atlas antes de ejecutar el primer caso.
 */
const app = express();

// No anunciar Express ni su versión a quien explore la API
app.disable("x-powered-by");

// Solo los orígenes declarados pueden llamar a la API desde un navegador.
// CLIENT_ORIGIN admite varios separados por coma (p. ej. Vercel + local).
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5180").split(",").map((o) => o.trim());

app.use(express.json());
app.use(cors({ origin: allowedOrigins }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/locations", require("./routes/locations"));
app.use("/api/products", require("./routes/products"));
app.use("/api/stocks", require("./routes/stocks"));
app.use("/api/movements", require("./routes/movements"));
app.use("/api/customer-orders", require("./routes/customerOrders"));
app.use("/api/purchase-orders", require("./routes/purchaseOrders"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/stats", require("./routes/stats"));

// Verificación de estado para el proveedor de despliegue
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((req, res) => res.status(404).json({ message: "Ruta no encontrada" }));
app.use(errorHandler);

module.exports = app;
