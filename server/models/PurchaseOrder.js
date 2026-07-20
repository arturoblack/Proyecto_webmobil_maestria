const mongoose = require("mongoose");

// Pedido de reposición a un proveedor; al recepcionarlo genera entradas automáticas
const PurchaseOrderSchema = new mongoose.Schema(
  {
    supplierName: { type: String, required: [true, "El nombre del proveedor es obligatorio"], trim: true },
    items: {
      type: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
          quantity: { type: Number, required: true, min: 1 },
        },
      ],
      validate: { validator: (v) => v.length > 0, message: "El pedido debe tener al menos un producto" },
    },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    status: { type: String, enum: ["pendiente", "recibido", "cancelado"], default: "pendiente" },
    receivedAt: { type: Date },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", PurchaseOrderSchema);
