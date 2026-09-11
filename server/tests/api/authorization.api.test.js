const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../../app");
const { connect, clear, disconnect } = require("../helpers/db");
const { seedUsers, loginAs } = require("../helpers/auth");

/**
 * Pruebas de autorización por rol (RF-02 y estándar de seguridad del proyecto).
 *
 * Ocultar una opción del menú nunca es el único control: el servidor debe
 * revalidar el rol en cada ruta. Estas pruebas recorren la matriz completa de
 * rutas de administración llamándolas directamente con un token de vendedor.
 */

const ID = new mongoose.Types.ObjectId().toString();

// Matriz de rutas que exigen rol de administrador
const RUTAS_ADMIN = [
  ["get", "/api/users"],
  ["post", "/api/users"],
  ["delete", `/api/users/${ID}`],
  ["post", "/api/products"],
  ["put", `/api/products/${ID}`],
  ["delete", `/api/products/${ID}`],
  ["post", "/api/locations"],
  ["put", `/api/locations/${ID}`],
  ["delete", `/api/locations/${ID}`],
  ["post", "/api/movements"],
  ["put", `/api/stocks/${ID}/min-stock`],
  ["get", "/api/purchase-orders"],
  ["post", "/api/purchase-orders"],
  ["post", `/api/purchase-orders/${ID}/receive`],
  ["post", `/api/purchase-orders/${ID}/cancel`],
];

// Rutas que el vendedor sí puede usar, según el alcance declarado de su rol
const RUTAS_VENDEDOR = [
  ["get", "/api/locations"],
  ["get", "/api/products"],
  ["get", "/api/stocks"],
  ["get", "/api/movements"],
  ["get", "/api/stats"],
  ["get", "/api/sales"],
  ["get", "/api/customer-orders"],
];

let tokenAdmin;
let tokenVendedor;

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await clear();
  await seedUsers();
  tokenAdmin = await loginAs(request, app, "admin");
  tokenVendedor = await loginAs(request, app, "vendedor");
});

describe("Rutas de administración frente a un token de vendedor", () => {
  test.each(RUTAS_ADMIN)("%s %s responde 403", async (metodo, ruta) => {
    // Act: el vendedor llama directamente al endpoint, saltándose la interfaz
    const response = await request(app)[metodo](ruta).set("Authorization", tokenVendedor).send({});

    // Assert: el servidor lo rechaza por permiso, no por otra causa
    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/permiso|administrador/i);
  });
});

describe("Rutas de administración sin autenticar", () => {
  test.each(RUTAS_ADMIN)("%s %s responde 401", async (metodo, ruta) => {
    const response = await request(app)[metodo](ruta).send({});

    expect(response.status).toBe(401);
  });
});

describe("Alcance legítimo del vendedor", () => {
  test.each(RUTAS_VENDEDOR)("%s %s NO responde 403", async (metodo, ruta) => {
    // Act
    const response = await request(app)[metodo](ruta).set("Authorization", tokenVendedor);

    // Assert: puede consultar; cualquier otro código sería un fallo distinto al de permisos
    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  test("el vendedor puede registrar un pedido de cliente", async () => {
    // Arrange: hace falta una tienda y un producto reales
    const tienda = await request(app)
      .post("/api/locations")
      .set("Authorization", tokenAdmin)
      .send({ name: "Tienda Jr. Lima", type: "tienda" });
    const producto = await request(app)
      .post("/api/products")
      .set("Authorization", tokenAdmin)
      .send({ name: "Cuaderno Loro 92 h. cuadriculado", sku: "CUA-LOR-92", price: 4.5 });

    // Act
    const response = await request(app)
      .post("/api/customer-orders")
      .set("Authorization", tokenVendedor)
      .send({
        customerName: "Carmen Rojas",
        locationId: tienda.body._id,
        items: [{ productId: producto.body._id, quantity: 2 }],
      });

    // Assert
    expect(response.status).toBe(201);
  });
});

describe("El administrador alcanza todo", () => {
  test("puede listar usuarios, que es la ruta más restringida", async () => {
    const response = await request(app).get("/api/users").set("Authorization", tokenAdmin);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("el listado de usuarios nunca expone contraseñas", async () => {
    const response = await request(app).get("/api/users").set("Authorization", tokenAdmin);

    response.body.forEach((usuario) => expect(usuario).not.toHaveProperty("password"));
  });
});

describe("El rol proviene del token y no del cuerpo de la petición", () => {
  test("declarar role admin en el cuerpo no eleva privilegios", async () => {
    // Act: el vendedor intenta convencer al servidor de que es administrador
    const response = await request(app)
      .get("/api/users")
      .set("Authorization", tokenVendedor)
      .send({ role: "admin" });

    // Assert
    expect(response.status).toBe(403);
  });

  test("el alta de usuarios sanea el rol con lista blanca", async () => {
    // Act: un rol inventado debe degradarse a vendedor, no crearse tal cual
    const response = await request(app)
      .post("/api/users")
      .set("Authorization", tokenAdmin)
      .send({ username: "nuevo", name: "Usuario Nuevo", password: "clave123", role: "superadmin" });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.role).toBe("vendedor");
  });
});
