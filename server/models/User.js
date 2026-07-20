const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "El nombre de usuario es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: [true, "El nombre es obligatorio"], trim: true },
    password: { type: String, required: [true, "La contraseña es obligatoria"] },
    role: { type: String, enum: ["admin", "vendedor"], default: "vendedor" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
