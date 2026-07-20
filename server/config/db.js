const mongoose = require("mongoose");

// Conecta a MongoDB Atlas; si falla, el proceso termina: sin base de datos la API no tiene sentido
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.info("✅ Conectado a MongoDB Atlas");
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
