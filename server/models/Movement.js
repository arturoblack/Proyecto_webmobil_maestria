const mongoose = require("mongoose");

const MOVEMENT_TYPES = ["entrada", "salida", "transferencia", "venta"];

// El kardex es la fuente de verdad del inventario: toda mutación de stock deja un documento aquí
const MovementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: [1, "La cantidad mínima es 1"] },
    // origen aplica a salida/transferencia/venta; destino a entrada/transferencia
    origin: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    unitPrice: { type: Number, min: 0 },
    reason: { type: String, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

MovementSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Movement", MovementSchema);
module.exports.MOVEMENT_TYPES = MOVEMENT_TYPES;
