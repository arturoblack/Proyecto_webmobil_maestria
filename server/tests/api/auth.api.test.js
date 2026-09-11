const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../../app");
const { connect, clear, disconnect } = require("../helpers/db");
const { CREDENTIALS, seedUsers } = require("../helpers/auth");

/**
 * Pruebas de API del inicio de sesión y del middleware de token (RF-01).
 *
 * Montan la aplicación con Supertest sin abrir ningún puerto, lo que es posible
 * porque app.js exporta la aplicación ya configurada y el arranque vive aparte.
 */

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await clear();
  await seedUsers();
});

describe("POST /api/auth/login — credenciales válidas", () => {
  test("devuelve 200 con el token y los datos públicos del usuario", async () => {
    // Arrange
    const { username, password } = CREDENTIALS.admin;

    // Act
    const response = await request(app).post("/api/auth/login").send({ username, password });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ username: "admin", role: "admin" });
  });

  test("nunca devuelve la contraseña ni su hash", async () => {
    // Act
    const response = await request(app).post("/api/auth/login").send(CREDENTIALS.admin);

    // Assert
    expect(JSON.stringify(response.body)).not.toContain("admin123");
    expect(response.body.user).not.toHaveProperty("password");
  });

  test("el token lleva el rol y caduca a las 8 horas", async () => {
    // Act
    const response = await request(app).post("/api/auth/login").send(CREDENTIALS.vendedor);
    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET);

    // Assert: la duración es parte del contrato de sesión declarado en el RF-01
    expect(payload.role).toBe("vendedor");
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
  });

  test("acepta el usuario en mayúsculas y con espacios alrededor", async () => {
    // Arrange: el modelo normaliza a minúsculas, así que la caja no debe importar
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "  ADMIN  ", password: "admin123" });

    // Assert
    expect(response.status).toBe(200);
  });
});

describe("POST /api/auth/login — credenciales inválidas", () => {
  test("un usuario inexistente y una contraseña incorrecta dan el MISMO 400", async () => {
    // Arrange y Act
    const inexistente = await request(app)
      .post("/api/auth/login")
      .send({ username: "nadie", password: "loquesea" });
    const passwordMala = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "incorrecta" });

    // Assert: si los mensajes difirieran, se podrían enumerar cuentas válidas
    expect(inexistente.status).toBe(400);
    expect(passwordMala.status).toBe(400);
    expect(inexistente.body.message).toBe(passwordMala.body.message);
  });

  test("exige usuario y contraseña", async () => {
    const sinPassword = await request(app).post("/api/auth/login").send({ username: "admin" });
    const sinUsuario = await request(app).post("/api/auth/login").send({ password: "admin123" });
    const vacio = await request(app).post("/api/auth/login").send({});

    [sinPassword, sinUsuario, vacio].forEach((response) => {
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/obligatorios/);
    });
  });

  test("responde siempre con el contrato uniforme { message }", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "incorrecta" });

    expect(Object.keys(response.body)).toEqual(["message"]);
  });
});

describe("verifyToken — acceso a una ruta protegida", () => {
  const RUTA = "/api/locations";

  test("sin cabecera Authorization responde 401", async () => {
    const response = await request(app).get(RUTA);

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/token/i);
  });

  test("con un esquema distinto de Bearer responde 401", async () => {
    const response = await request(app).get(RUTA).set("Authorization", "Basic YWRtaW46YWRtaW4=");

    expect(response.status).toBe(401);
  });

  test("con un token malformado responde 401", async () => {
    const response = await request(app).get(RUTA).set("Authorization", "Bearer no-es-un-token");

    expect(response.status).toBe(401);
  });

  test("con un token firmado con otro secreto responde 401", async () => {
    // Arrange: un atacante que fabrica su propio token de administrador
    const falsificado = jwt.sign({ id: "000000000000000000000000", role: "admin" }, "otro-secreto");

    // Act
    const response = await request(app).get(RUTA).set("Authorization", `Bearer ${falsificado}`);

    // Assert
    expect(response.status).toBe(401);
  });

  test("con un token caducado responde 401", async () => {
    // Arrange
    const caducado = jwt.sign({ id: "000000000000000000000000", role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "-1h",
    });

    // Act
    const response = await request(app).get(RUTA).set("Authorization", `Bearer ${caducado}`);

    // Assert
    expect(response.status).toBe(401);
  });

  test("con un token válido responde 200", async () => {
    // Arrange
    const login = await request(app).post("/api/auth/login").send(CREDENTIALS.vendedor);

    // Act
    const response = await request(app).get(RUTA).set("Authorization", `Bearer ${login.body.token}`);

    // Assert
    expect(response.status).toBe(200);
  });
});

describe("Rutas públicas y desconocidas", () => {
  test("la sonda de salud no exige token", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  test("una ruta inexistente responde 404 con el contrato uniforme", async () => {
    const response = await request(app).get("/api/no-existe");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Ruta no encontrada");
  });
});
