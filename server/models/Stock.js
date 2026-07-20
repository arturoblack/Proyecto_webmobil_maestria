const mongoose = require("mongoose");

// El stock pertenece al par producto–ubicación: es la decisión estructural del sistema
const StockSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    quantity: { type: Number, required: true, default: 0, min: [0, "El stock no puede ser negativo"] },
    minStock: { type: Number, required: true, default: 5, min: 0 },
  },
  { timestamps: true }
);

// Un solo registro de existencias por producto y ubicación
StockSchema.index({ product: 1, location: 1 }, { unique: true });

module.exports = mongoose.model("Stock", StockSchema);
