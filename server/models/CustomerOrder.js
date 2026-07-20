const mongoose = require("mongoose");

// Encargo de un cliente registrado por el vendedor; no afecta el stock
const CustomerOrderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: [true, "El nombre del cliente es obligatorio"], trim: true },
    phone: { type: String, trim: true },
    items: {
      type: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
          quantity: { type: Number, required: true, min: 1 },
        },
      ],
      validate: { validator: (v) => v.length > 0, message: "El pedido debe tener al menos un producto" },
    },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    status: { type: String, enum: ["pendiente", "entregado", "cancelado"], default: "pendiente" },
    notes: { type: String, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerOrder", CustomerOrderSchema);
