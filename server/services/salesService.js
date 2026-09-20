const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Location = require("../models/Location");
const ApiError = require("../utils/ApiError");
const { applyMovement } = require("./inventoryService");

// Regla pura del pago simulado: en efectivo se exige monto suficiente y se calcula el vuelto
const computePayment = (method, total, paidWith) => {
  if (!["efectivo", "billetera"].includes(method)) {
    throw ApiError.badRequest("El método de pago debe ser efectivo o billetera");
  }
  if (method === "billetera") return { method, paidWith: total, change: 0 };
  const paid = Number(paidWith);
  if (!Number.isFinite(paid) || paid < total) {
    throw ApiError.badRequest("El monto pagado no puede ser menor al total de la venta");
  }
  // El vuelto se calcula en céntimos enteros. Antes de redondear se descarta el ruido binario
  // (20 - 12.345 deja 765.4999999999999 céntimos), o el medio céntimo exacto bajaría
  const changeCents = Math.round(Number(((paid - total) * 100).toFixed(6)));
  return { method, paidWith: paid, change: changeCents / 100 };
};

/**
 * Procesa una venta multi-ítem en una tienda: valida existencias de ESA tienda,
 * descuenta el stock vía el servicio de inventario (kardex) y registra la venta.
 * Todo dentro de una transacción: o se aplica completa, o no se aplica.
 */
const processSale = async ({ locationId, items, payment, userId }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest("La venta debe incluir al menos un producto");
  }

  const location = await Location.findById(locationId);
  if (!location) throw ApiError.notFound("Ubicación no encontrada");
  if (location.type !== "tienda") {
    throw ApiError.badRequest("Las ventas solo pueden procesarse en una tienda");
  }

  // El precio se toma del catálogo en el servidor: el cliente nunca define precios
  const saleItems = [];
  let total = 0;
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) throw ApiError.notFound("Uno de los productos de la venta no existe");
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw ApiError.badRequest(`Cantidad no válida para "${product.name}"`);
    }
    saleItems.push({ product: product._id, quantity, unitPrice: product.price });
    total += product.price * quantity;
  }
  total = Math.round(total * 100) / 100;

  const paymentInfo = computePayment(payment?.method, total, payment?.paidWith);

  const session = await mongoose.startSession();
  try {
    let sale;
    await session.withTransaction(async () => {
      for (const item of saleItems) {
        await applyMovement(
          {
            type: "venta",
            productId: item.product,
            originId: locationId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            reason: "Venta en tienda",
            userId,
          },
          session
        );
      }
      [sale] = await Sale.create(
        [{ items: saleItems, location: locationId, total, payment: paymentInfo, user: userId }],
        { session }
      );
    });
    // El populate debe resolverse aquí dentro: el documento arrastra la sesión de la
    // transacción y el finally la cierra antes de que una promesa sin await llegue a ejecutarse
    return await sale.populate([
      { path: "items.product", select: "name sku" },
      { path: "location", select: "name" },
    ]);
  } finally {
    session.endSession();
  }
};

module.exports = { processSale, computePayment };
