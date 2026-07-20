const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/auth/login — RF-01
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) throw ApiError.badRequest("Usuario y contraseña son obligatorios");

  const user = await User.findOne({ username: String(username).toLowerCase().trim() });
  const validPassword = user && (await bcrypt.compare(password, user.password));
  if (!validPassword) throw ApiError.badRequest("Credenciales incorrectas");

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({
    token,
    user: { id: user._id, username: user.username, name: user.name, role: user.role },
  });
});

module.exports = { login };
