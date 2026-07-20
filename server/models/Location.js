const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "El nombre de la ubicación es obligatorio"], trim: true },
    type: {
      type: String,
      enum: { values: ["almacen", "tienda"], message: "El tipo debe ser almacen o tienda" },
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", LocationSchema);
