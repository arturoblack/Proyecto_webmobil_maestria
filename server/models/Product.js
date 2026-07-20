const mongoose = require("mongoose");

const PRODUCT_CATEGORIES = ["Cuadernos", "Escritura", "Arte", "Papelería", "Oficina", "Otros"];

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "El nombre del producto es obligatorio"], trim: true },
    sku: { type: String, required: [true, "El SKU es obligatorio"], unique: true, trim: true, uppercase: true },
    category: { type: String, enum: PRODUCT_CATEGORIES, default: "Otros" },
    price: { type: Number, required: [true, "El precio es obligatorio"], min: [0, "El precio no puede ser negativo"] },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
