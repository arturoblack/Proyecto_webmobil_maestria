const bcrypt = require("bcryptjs");
const User = require("../../models/User");

/**
 * Ayudantes de autenticación para las pruebas de API.
 *
 * Crean usuarios reales en la base efímera y devuelven su token, en lugar de
 * falsificar la cabecera: así lo que se prueba es la cadena completa de
 * autenticación y autorización, no una suplantación del middleware.
 */

const CREDENTIALS = {
  admin: { username: "admin", name: "Iván Bolaños", password: "admin123", role: "admin" },
  vendedor: { username: "rosa", name: "Rosa Quispe", password: "rosa123", role: "vendedor" },
};

// Crea los dos usuarios del dominio y devuelve los documentos guardados
const seedUsers = async () => {
  const created = {};
  for (const [key, data] of Object.entries(CREDENTIALS)) {
    created[key] = await User.create({
      username: data.username,
      name: data.name,
      password: await bcrypt.hash(data.password, 10),
      role: data.role,
    });
  }
  return created;
};

// Inicia sesión por la API real y devuelve la cabecera lista para usar
const loginAs = async (request, app, key) => {
  const { username, password } = CREDENTIALS[key];
  const response = await request(app).post("/api/auth/login").send({ username, password });
  if (response.status !== 200) {
    throw new Error(`No se pudo iniciar sesión como ${key}: ${response.status}`);
  }
  return `Bearer ${response.body.token}`;
};

module.exports = { CREDENTIALS, seedUsers, loginAs };
