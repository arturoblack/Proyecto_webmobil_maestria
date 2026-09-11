require("dotenv").config();

const connectDB = require("./config/db");
const app = require("./app");

// Punto de arranque: conecta la base de datos y pone la API a escuchar.
// La construcción de la aplicación vive en app.js para poder probarla sin arrancarla.
const PORT = process.env.PORT || 5001;

connectDB();
app.listen(PORT, () => console.info(`🚀 API de LibreStock en el puerto ${PORT}`));
