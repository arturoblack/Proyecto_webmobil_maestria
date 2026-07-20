const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// RF-02 — solo administrador (la ruta aplica requireAdmin)
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

const createUser = asyncHandler(async (req, res) => {
  const { username, name, password, role } = req.body;
  if (!username || !name || !password) {
    throw ApiError.badRequest("Usuario, nombre y contraseña son obligatorios");
  }
  if (password.length < 6) {
    throw ApiError.badRequest("La contraseña debe tener al menos 6 caracteres");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    name,
    password: hashedPassword,
    role: role === "admin" ? "admin" : "vendedor",
  });
  res.status(201).json({ id: user._id, username: user.username, name: user.name, role: user.role });
});

const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest("No puedes eliminar tu propia cuenta");
  }
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound("Usuario no encontrado");
  res.json({ message: "Usuario eliminado correctamente" });
});

module.exports = { listUsers, createUser, deleteUser };
