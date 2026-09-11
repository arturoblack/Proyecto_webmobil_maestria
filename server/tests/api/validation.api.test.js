const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../../app");
const { connect, clear, disconnect } = require("../helpers/db");
const { seedUsers, loginAs } = require("../helpers/auth");

/**
 * Pruebas de validación de entrada del catálogo, los movimientos y los usuarios.
 *
 * Verifican que el servidor rechaza los datos inválidos con el código HTTP
 * semántico que declara el contrato: 400 validación, 404 no existe, 409 conflicto.
 */

let token;
let almacen;
let producto;

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await clear();
  await seedUsers();
  token = await loginAs(request, app, "admin");

  almacen = (
    await request(app)
      .post("/api/locations")
      .set("Authorization", token)
      .send({ name: "Almacén Central", type: "almacen" })
  ).body;

  producto = (
    await request(app)
      .post("/api/products")
      .set("Authorization", token)
      .send({ name: "Cuaderno Loro 92 h. cuadriculado", sku: "CUA-LOR-92", category: "Cuadernos", price: 4.5 })
  ).body;
});

describe("Catálogo — validación del alta de productos", () => {
  test("exige nombre, SKU y precio", async () => {
    const response = await request(app).post("/api/products").set("Authorization", token).send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(expect.any(String));
  });

  test("rechaza un precio negativo", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", token)
      .send({ name: "Lápiz Mongol N°2", sku: "LAP-MON-02", price: -1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/precio/i);
  });

  test("acepta un precio de cero, que el negocio usa para promociones", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", token)
      .send({ name: "Separador de regalo", sku: "REG-SEP-01", price: 0 });

    expect(response.status).toBe(201);
  });

  test("rechaza una categoría fuera de la lista admitida", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", token)
      .send({ name: "Mochila escolar", sku: "MOC-ESC-01", price: 59.9, category: "Mochilas" });

    expect(response.status).toBe(400);
  });

  test("un SKU duplicado da 409, aunque llegue en minúsculas", async () => {
    // Arrange: el modelo normaliza el SKU a mayúsculas
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", token)
      .send({ name: "Otro cuaderno", sku: "cua-lor-92", price: 5 });

    // Assert
    expect(response.status).toBe(409);
  });

  test("el stock no se puede fijar desde el catálogo", async () => {
    // Act: se intenta colar una cantidad en el alta
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", token)
      .send({ name: "Plumones Artesco x10", sku: "PLU-ART-10", price: 12.9, quantity: 500, stock: 500 });

    // Assert: el producto se crea pero sin rastro de existencias
    expect(response.status).toBe(201);
    expect(response.body).not.toHaveProperty("quantity");
    expect(response.body).not.toHaveProperty("stock");
  });

  test("un identificador malformado da 400 y no 500", async () => {
    const response = await request(app)
      .put("/api/products/no-es-un-id")
      .set("Authorization", token)
      .send({ name: "X" });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/identificador/i);
  });

  test("un identificador válido pero inexistente da 404", async () => {
    const inexistente = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
      .put(`/api/products/${inexistente}`)
      .set("Authorization", token)
      .send({ name: "X" });

    expect(response.status).toBe(404);
  });
});

describe("Ubicaciones — validación", () => {
  test("rechaza un tipo distinto de almacen o tienda", async () => {
    const response = await request(app)
      .post("/api/locations")
      .set("Authorization", token)
      .send({ name: "Kiosco", type: "kiosco" });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/almacen o tienda/i);
  });

  test("exige el nombre", async () => {
    const response = await request(app)
      .post("/api/locations")
      .set("Authorization", token)
      .send({ type: "tienda" });

    expect(response.status).toBe(400);
  });
});

describe("Movimientos — validación de la cantidad y de las ubicaciones", () => {
  const movimientoBase = () => ({ type: "entrada", productId: producto._id, destinationId: almacen._id });

  test.each([
    ["cero", 0],
    ["negativa", -5],
    ["fraccionaria", 2.5],
    ["no numérica", "diez"],
  ])("rechaza una cantidad %s", async (_caso, quantity) => {
    const response = await request(app)
      .post("/api/movements")
      .set("Authorization", token)
      .send({ ...movimientoBase(), quantity });

    expect(response.status).toBe(400);
  });

  test("rechaza un tipo de movimiento desconocido", async () => {
    const response = await request(app)
      .post("/api/movements")
      .set("Authorization", token)
      .send({ ...movimientoBase(), type: "merma", quantity: 1 });

    expect(response.status).toBe(400);
  });

  test("una salida sin origen da 400", async () => {
    const response = await request(app)
      .post("/api/movements")
      .set("Authorization", token)
      .send({ type: "salida", productId: producto._id, quantity: 1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/origen/);
  });

  test("una transferencia con origen igual a destino da 400", async () => {
    const response = await request(app)
      .post("/api/movements")
      .set("Authorization", token)
      .send({
        type: "transferencia",
        productId: producto._id,
        originId: almacen._id,
        destinationId: almacen._id,
        quantity: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/distintos/);
  });

  test("un producto inexistente da 404", async () => {
    const response = await request(app)
      .post("/api/movements")
      .set("Authorization", token)
      .send({ ...movimientoBase(), productId: new mongoose.Types.ObjectId().toString(), quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/Producto/i);
  });

  test("una ubicación inexistente da 404", async () => {
    const response = await request(app)
      .post("/api/movements")
      .set("Authorization", token)
      .send({ ...movimientoBase(), destinationId: new mongoose.Types.ObjectId().toString(), quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/Ubicación/i);
  });
});

describe("Usuarios — validación del alta", () => {
  test("exige usuario, nombre y contraseña", async () => {
    const response = await request(app).post("/api/users").set("Authorization", token).send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/obligatorios/);
  });

  test("rechaza una contraseña de menos de 6 caracteres", async () => {
    const response = await request(app)
      .post("/api/users")
      .set("Authorization", token)
      .send({ username: "corto", name: "Clave Corta", password: "12345" });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/6 caracteres/);
  });

  test("acepta una contraseña de exactamente 6 caracteres", async () => {
    const response = await request(app)
      .post("/api/users")
      .set("Authorization", token)
      .send({ username: "justo", name: "Clave Justa", password: "123456" });

    expect(response.status).toBe(201);
  });

  test("un nombre de usuario duplicado da 409", async () => {
    const response = await request(app)
      .post("/api/users")
      .set("Authorization", token)
      .send({ username: "ADMIN", name: "Duplicado", password: "clave123" });

    expect(response.status).toBe(409);
  });
});
