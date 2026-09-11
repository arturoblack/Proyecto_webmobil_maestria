const request = require("supertest");

const app = require("../../app");
const { connect, clear, disconnect } = require("../helpers/db");
const { seedUsers, loginAs } = require("../helpers/auth");

/**
 * Pruebas de API del núcleo del sistema: catálogo, existencias y kardex.
 *
 * Verifican por HTTP las reglas que sostienen la integridad del inventario:
 * el stock pertenece al par producto-ubicación, nunca queda negativo, toda
 * mutación deja asiento y la transferencia conserva las unidades totales.
 */

let token;
let almacen;
let tienda;
let cuaderno;

const crearUbicacion = (name, type) =>
  request(app).post("/api/locations").set("Authorization", token).send({ name, type });

const crearProducto = (name, sku, price, category = "Otros") =>
  request(app).post("/api/products").set("Authorization", token).send({ name, sku, price, category });

const movimiento = (body) => request(app).post("/api/movements").set("Authorization", token).send(body);

const stockDe = async (productId, locationId) => {
  const response = await request(app)
    .get("/api/stocks")
    .query({ locationId })
    .set("Authorization", token);
  const fila = response.body.find((s) => s.product && s.product._id === productId);
  return fila ? fila.quantity : 0;
};

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await clear();
  await seedUsers();
  token = await loginAs(request, app, "admin");
  almacen = (await crearUbicacion("Almacén Central", "almacen")).body;
  tienda = (await crearUbicacion("Tienda Jr. Lima", "tienda")).body;
  cuaderno = (await crearProducto("Cuaderno Loro 92 h. cuadriculado", "CUA-LOR-92", 4.5, "Cuadernos")).body;
});

describe("Catálogo", () => {
  test("lista y busca por nombre y por SKU sin distinguir mayúsculas", async () => {
    // Arrange
    await crearProducto("Lápiz Mongol N°2", "LAP-MON-02", 1.2, "Escritura");

    // Act
    const porNombre = await request(app).get("/api/products").query({ search: "cuaderno" }).set("Authorization", token);
    const porSku = await request(app).get("/api/products").query({ search: "lap-mon" }).set("Authorization", token);

    // Assert
    expect(porNombre.body).toHaveLength(1);
    expect(porNombre.body[0].sku).toBe("CUA-LOR-92");
    expect(porSku.body).toHaveLength(1);
  });

  test("no se puede eliminar un producto con existencias", async () => {
    // Arrange: se ingresan unidades al almacén
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: almacen._id, quantity: 10 });

    // Act
    const response = await request(app).delete(`/api/products/${cuaderno._id}`).set("Authorization", token);

    // Assert
    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/existencias/i);
  });
});

describe("Existencias por par producto-ubicación", () => {
  test("una entrada crea la fila de stock de la sede y suma", async () => {
    // Act
    const response = await movimiento({
      type: "entrada",
      productId: cuaderno._id,
      destinationId: almacen._id,
      quantity: 140,
    });

    // Assert
    expect(response.status).toBe(201);
    expect(await stockDe(cuaderno._id, almacen._id)).toBe(140);
  });

  test("el stock de una sede no afecta al de la otra", async () => {
    // Arrange
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: almacen._id, quantity: 140 });
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: tienda._id, quantity: 3 });

    // Assert: el mismo producto tiene saldos independientes por sede
    expect(await stockDe(cuaderno._id, almacen._id)).toBe(140);
    expect(await stockDe(cuaderno._id, tienda._id)).toBe(3);
  });

  test("el filtro de stock bajo incluye la cantidad igual al mínimo", async () => {
    // Arrange: el mínimo por defecto es 5, así que una entrada de 5 queda en el límite
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: tienda._id, quantity: 5 });

    // Act
    const response = await request(app)
      .get("/api/stocks")
      .query({ lowStock: "true" })
      .set("Authorization", token);

    // Assert: la alerta se dispara con menor O IGUAL, no solo con menor
    expect(response.body).toHaveLength(1);
    expect(response.body[0].quantity).toBe(5);
  });
});

describe("El stock nunca queda negativo", () => {
  test("una salida mayor a las existencias se rechaza y no altera el saldo", async () => {
    // Arrange
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: almacen._id, quantity: 10 });

    // Act
    const response = await movimiento({
      type: "salida",
      productId: cuaderno._id,
      originId: almacen._id,
      quantity: 11,
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Stock insuficiente/);
    expect(await stockDe(cuaderno._id, almacen._id)).toBe(10);
  });

  test("una salida de exactamente todo el stock se acepta y deja cero", async () => {
    // Arrange
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: almacen._id, quantity: 10 });

    // Act
    const response = await movimiento({
      type: "salida",
      productId: cuaderno._id,
      originId: almacen._id,
      quantity: 10,
    });

    // Assert
    expect(response.status).toBe(201);
    expect(await stockDe(cuaderno._id, almacen._id)).toBe(0);
  });

  test("una salida sobre una sede sin existencias se rechaza", async () => {
    const response = await movimiento({
      type: "salida",
      productId: cuaderno._id,
      originId: tienda._id,
      quantity: 1,
    });

    expect(response.status).toBe(400);
  });
});

describe("Transferencia entre sedes", () => {
  test("descuenta en origen, abona en destino y conserva las unidades totales", async () => {
    // Arrange
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: almacen._id, quantity: 100 });

    // Act
    const response = await movimiento({
      type: "transferencia",
      productId: cuaderno._id,
      originId: almacen._id,
      destinationId: tienda._id,
      quantity: 30,
    });

    // Assert
    expect(response.status).toBe(201);
    const enAlmacen = await stockDe(cuaderno._id, almacen._id);
    const enTienda = await stockDe(cuaderno._id, tienda._id);
    expect(enAlmacen).toBe(70);
    expect(enTienda).toBe(30);
    expect(enAlmacen + enTienda).toBe(100);
  });

  test("una transferencia sin existencias suficientes no mueve nada en ninguna sede", async () => {
    // Arrange
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: almacen._id, quantity: 5 });

    // Act
    const response = await movimiento({
      type: "transferencia",
      productId: cuaderno._id,
      originId: almacen._id,
      destinationId: tienda._id,
      quantity: 50,
    });

    // Assert: la transacción se descarta entera
    expect(response.status).toBe(400);
    expect(await stockDe(cuaderno._id, almacen._id)).toBe(5);
    expect(await stockDe(cuaderno._id, tienda._id)).toBe(0);
  });
});

describe("Kardex", () => {
  test("toda mutación de existencias deja su asiento", async () => {
    // Arrange
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: almacen._id, quantity: 100 });
    await movimiento({
      type: "transferencia",
      productId: cuaderno._id,
      originId: almacen._id,
      destinationId: tienda._id,
      quantity: 10,
    });
    await movimiento({ type: "salida", productId: cuaderno._id, originId: almacen._id, quantity: 2 });

    // Act
    const response = await request(app).get("/api/movements").set("Authorization", token);

    // Assert
    expect(response.body).toHaveLength(3);
    expect(response.body.map((m) => m.type).sort()).toEqual(["entrada", "salida", "transferencia"]);
  });

  test("el asiento registra el motivo y el usuario que lo hizo", async () => {
    // Arrange
    await movimiento({
      type: "entrada",
      productId: cuaderno._id,
      destinationId: almacen._id,
      quantity: 12,
      reason: "compra directa a proveedor local",
    });

    // Act
    const response = await request(app).get("/api/movements").set("Authorization", token);

    // Assert
    expect(response.body[0].reason).toBe("compra directa a proveedor local");
    expect(response.body[0].user.name).toBe("Iván Bolaños");
  });

  test("se puede filtrar el kardex por tipo", async () => {
    // Arrange
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: almacen._id, quantity: 50 });
    await movimiento({ type: "salida", productId: cuaderno._id, originId: almacen._id, quantity: 5 });

    // Act
    const response = await request(app).get("/api/movements").query({ type: "salida" }).set("Authorization", token);

    // Assert
    expect(response.body).toHaveLength(1);
    expect(response.body[0].type).toBe("salida");
  });

  test("el precio del asiento se hereda del catálogo, no del cliente", async () => {
    // Act: el cliente intenta imponer un precio unitario en el movimiento
    await movimiento({
      type: "entrada",
      productId: cuaderno._id,
      destinationId: almacen._id,
      quantity: 1,
      unitPrice: 0.01,
    });

    // Assert
    const response = await request(app).get("/api/movements").set("Authorization", token);
    expect(response.body[0].unitPrice).toBe(4.5);
  });
});

describe("Punto de venta por HTTP", () => {
  test("una venta en tienda descuenta el stock y cobra el precio del catálogo", async () => {
    // Arrange
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: tienda._id, quantity: 10 });

    // Act
    const response = await request(app)
      .post("/api/sales")
      .set("Authorization", token)
      .send({
        locationId: tienda._id,
        items: [{ productId: cuaderno._id, quantity: 2, unitPrice: 0.01 }],
        payment: { method: "efectivo", paidWith: 20 },
      });

    // Assert: el precio impuesto por el cliente se ignora
    expect(response.status).toBe(201);
    expect(response.body.total).toBe(9);
    expect(response.body.payment.change).toBe(11);
    expect(await stockDe(cuaderno._id, tienda._id)).toBe(8);
  });

  test("no se puede vender en un almacén", async () => {
    // Arrange
    await movimiento({ type: "entrada", productId: cuaderno._id, destinationId: almacen._id, quantity: 10 });

    // Act
    const response = await request(app)
      .post("/api/sales")
      .set("Authorization", token)
      .send({
        locationId: almacen._id,
        items: [{ productId: cuaderno._id, quantity: 1 }],
        payment: { method: "billetera" },
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/tienda/);
    expect(await stockDe(cuaderno._id, almacen._id)).toBe(10);
  });
});
