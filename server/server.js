const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(express.json());
app.use(cors());

connectDB();

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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.info(`🚀 API de LibreStock en el puerto ${PORT}`));
