const mongoose = require("mongoose");

// Venta procesada en una tienda con pago simulado; las salidas quedan en el kardex
const SaleSchema = new mongoose.Schema(
  {
    items: {
      type: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
          quantity: { type: Number, required: true, min: 1 },
          unitPrice: { type: Number, required: true, min: 0 },
        },
      ],
      validate: { validator: (v) => v.length > 0, message: "La venta debe tener al menos un producto" },
    },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    total: { type: Number, required: true, min: 0 },
    payment: {
      method: { type: String, enum: ["efectivo", "billetera"], required: true },
      paidWith: { type: Number, min: 0 },
      change: { type: Number, min: 0 },
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

SaleSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Sale", SaleSchema);
