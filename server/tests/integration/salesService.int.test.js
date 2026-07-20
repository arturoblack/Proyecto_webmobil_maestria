const mongoose = require("mongoose");
const { connect, clear, disconnect } = require("../helpers/db");
const { processSale } = require("../../services/salesService");
const Stock = require("../../models/Stock");
const Sale = require("../../models/Sale");
const Movement = require("../../models/Movement");
const Product = require("../../models/Product");
const Location = require("../../models/Location");

/**
 * Pruebas de integración del punto de venta (RF-13) contra un MongoDB real con replica set.
 *
 * Cubren lo que las pruebas unitarias no pueden ver: que la transacción realmente
 * commitee, que el stock se descuente solo en la sede correcta y que una venta
 * multi-ítem inviable no deje rastro parcial.
 */

const USER_ID = new mongoose.Types.ObjectId();

let tienda;
let almacen;
let cuaderno;
let lapiz;

// Deja la tienda con 10 cuadernos (S/ 4.50) y 4 lápices (S/ 0.80); el almacén con 100 cuadernos
const seedFixtures = async () => {
  [tienda, almacen] = await Location.create([
    { name: "Tienda Jr. Lima", type: "tienda" },
    { name: "Almacén Central", type: "almacen" },
  ]);
  [cuaderno, lapiz] = await Product.create([
    { name: "Cuaderno Loro 92 h. cuadriculado", sku: "CUA-LORO-92", category: "Cuadernos", price: 4.5 },
    { name: "Lápiz Mongol N°2", sku: "ESC-MONGOL-2", category: "Escritura", price: 0.8 },
  ]);
  await Stock.create([
    { product: cuaderno._id, location: tienda._id, quantity: 10 },
    { product: lapiz._id, location: tienda._id, quantity: 4 },
    { product: cuaderno._id, location: almacen._id, quantity: 100 },
  ]);
};

const quantityAt = async (product, location) => {
  const stock = await Stock.findOne({ product: product._id, location: location._id });
  return stock.quantity;
};

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await clear();
  await seedFixtures();
});

describe("processSale — venta completa sobre base de datos real", () => {
  test("descuenta el stock de la tienda, registra la venta y asienta el kardex", async () => {
    const sale = await processSale({
      locationId: tienda._id,
      items: [
        { productId: cuaderno._id, quantity: 2 },
        { productId: lapiz._id, quantity: 3 },
      ],
      payment: { method: "efectivo", paidWith: 20 },
      userId: USER_ID,
    });

    // 2 × 4.50 + 3 × 0.80 = 11.40
    expect(sale.total).toBe(11.4);
    expect(sale.payment.change).toBe(8.6);
    expect(await quantityAt(cuaderno, tienda)).toBe(8);
    expect(await quantityAt(lapiz, tienda)).toBe(1);

    const movements = await Movement.find({ type: "venta" });
    expect(movements).toHaveLength(2);
    expect(await Sale.countDocuments()).toBe(1);
  });

  // Regresión: el populate se resolvía fuera de la sesión y toda venta respondía HTTP 500
  test("devuelve la venta ya populada, sin arrastrar la sesión de la transacción", async () => {
    const sale = await processSale({
      locationId: tienda._id,
      items: [{ productId: cuaderno._id, quantity: 1 }],
      payment: { method: "billetera" },
      userId: USER_ID,
    });

    expect(sale.items[0].product.name).toBe("Cuaderno Loro 92 h. cuadriculado");
    expect(sale.items[0].product.sku).toBe("CUA-LORO-92");
    expect(sale.location.name).toBe("Tienda Jr. Lima");
  });

  test("una venta multi-ítem inviable no deja rastro parcial", async () => {
    // El primer ítem alcanza; el segundo excede las 4 unidades disponibles
    await expect(
      processSale({
        locationId: tienda._id,
        items: [
          { productId: cuaderno._id, quantity: 2 },
          { productId: lapiz._id, quantity: 99 },
        ],
        payment: { method: "efectivo", paidWith: 100 },
        userId: USER_ID,
      })
    ).rejects.toThrow(/Stock insuficiente/);

    // Ni el ítem que sí alcanzaba debe haberse descontado
    expect(await quantityAt(cuaderno, tienda)).toBe(10);
    expect(await quantityAt(lapiz, tienda)).toBe(4);
    expect(await Sale.countDocuments()).toBe(0);
    expect(await Movement.countDocuments()).toBe(0);
  });

  test("el precio sale del catálogo aunque el cliente intente imponer el suyo", async () => {
    const sale = await processSale({
      locationId: tienda._id,
      items: [{ productId: cuaderno._id, quantity: 2, unitPrice: 0.01, price: 0.01 }],
      payment: { method: "billetera" },
      userId: USER_ID,
    });

    expect(sale.total).toBe(9);
    expect(sale.items[0].unitPrice).toBe(4.5);
  });

  test("el descuento afecta solo a la sede donde se vende", async () => {
    await processSale({
      locationId: tienda._id,
      items: [{ productId: cuaderno._id, quantity: 5 }],
      payment: { method: "billetera" },
      userId: USER_ID,
    });

    expect(await quantityAt(cuaderno, tienda)).toBe(5);
    expect(await quantityAt(cuaderno, almacen)).toBe(100);
  });

  test("rechaza vender en un almacén y no toca sus existencias", async () => {
    await expect(
      processSale({
        locationId: almacen._id,
        items: [{ productId: cuaderno._id, quantity: 1 }],
        payment: { method: "billetera" },
        userId: USER_ID,
      })
    ).rejects.toThrow(/solo pueden procesarse en una tienda/);

    expect(await quantityAt(cuaderno, almacen)).toBe(100);
    expect(await Movement.countDocuments()).toBe(0);
  });

  test("un pago en efectivo insuficiente no llega a mover existencias", async () => {
    await expect(
      processSale({
        locationId: tienda._id,
        items: [{ productId: cuaderno._id, quantity: 2 }],
        payment: { method: "efectivo", paidWith: 5 },
        userId: USER_ID,
      })
    ).rejects.toThrow(/monto pagado/);

    expect(await quantityAt(cuaderno, tienda)).toBe(10);
    expect(await Sale.countDocuments()).toBe(0);
  });
});
