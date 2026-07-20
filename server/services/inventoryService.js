const mongoose = require("mongoose");
const Stock = require("../models/Stock");
const Movement = require("../models/Movement");
const Product = require("../models/Product");
const Location = require("../models/Location");
const ApiError = require("../utils/ApiError");

/**
 * Servicio de inventario: ÚNICO lugar del sistema donde se mutan existencias.
 * Ventas, recepciones de pedidos, ajustes y transferencias pasan por applyMovement.
 *
 * Las funciones "validate*" son puras (sin base de datos) para permitir pruebas
 * unitarias directas de las reglas de negocio críticas.
 */

// --- Reglas puras (unit-testables) ---

const validateMovementInput = ({ type, quantity, originId, destinationId }) => {
  if (!Movement.MOVEMENT_TYPES.includes(type)) {
    throw ApiError.badRequest("El tipo debe ser entrada, salida, transferencia o venta");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw ApiError.badRequest("La cantidad debe ser un número entero mayor a 0");
  }
  const needsOrigin = ["salida", "transferencia", "venta"].includes(type);
  const needsDestination = ["entrada", "transferencia"].includes(type);
  if (needsOrigin && !originId) {
    throw ApiError.badRequest("Este tipo de movimiento requiere una ubicación de origen");
  }
  if (needsDestination && !destinationId) {
    throw ApiError.badRequest("Este tipo de movimiento requiere una ubicación de destino");
  }
  if (type === "transferencia" && String(originId) === String(destinationId)) {
    throw ApiError.badRequest("El origen y el destino de una transferencia deben ser distintos");
  }
};

// El stock del origen nunca puede quedar negativo: regla central del sistema
const validateSufficientStock = (available, requested, productName) => {
  if (available < requested) {
    throw ApiError.badRequest(
      `Stock insuficiente: solo hay ${available} unidades de "${productName}" en la ubicación de origen`
    );
  }
};

// --- Operaciones con base de datos ---

// Obtiene (o crea en cero) el registro de existencias del par producto–ubicación
const getOrCreateStock = async (productId, locationId, session) => {
  let stock = await Stock.findOne({ product: productId, location: locationId }).session(session);
  if (!stock) {
    [stock] = await Stock.create([{ product: productId, location: locationId, quantity: 0 }], {
      session,
    });
  }
  return stock;
};

/**
 * Aplica un movimiento de inventario de forma atómica y deja su rastro en el kardex.
 * @param {object} params { type, productId, originId, destinationId, quantity, reason, userId, unitPrice }
 * @param {object} [externalSession] sesión de una transacción mayor (p. ej. una venta multi-ítem)
 */
const applyMovement = async (params, externalSession = null) => {
  const { type, productId, originId, destinationId, quantity, reason, userId, unitPrice } = params;

  validateMovementInput({ type, quantity, originId, destinationId });

  const product = await Product.findById(productId).session(externalSession);
  if (!product) throw ApiError.notFound("Producto no encontrado");

  for (const locId of [originId, destinationId].filter(Boolean)) {
    const exists = await Location.exists({ _id: locId }).session(externalSession);
    if (!exists) throw ApiError.notFound("Ubicación no encontrada");
  }

  const run = async (session) => {
    if (["salida", "transferencia", "venta"].includes(type)) {
      const originStock = await getOrCreateStock(productId, originId, session);
      validateSufficientStock(originStock.quantity, quantity, product.name);
      originStock.quantity -= quantity;
      await originStock.save({ session });
    }
    if (["entrada", "transferencia"].includes(type)) {
      const destStock = await getOrCreateStock(productId, destinationId, session);
      destStock.quantity += quantity;
      await destStock.save({ session });
    }
    const [movement] = await Movement.create(
      [
        {
          type,
          product: productId,
          quantity,
          origin: originId || undefined,
          destination: destinationId || undefined,
          unitPrice: unitPrice ?? product.price,
          reason,
          user: userId,
        },
      ],
      { session }
    );
    return movement;
  };

  // Si el llamador ya abrió una transacción (venta, recepción), nos sumamos a ella
  if (externalSession) return run(externalSession);

  const session = await mongoose.startSession();
  try {
    let movement;
    await session.withTransaction(async () => {
      movement = await run(session);
    });
    return movement;
  } finally {
    session.endSession();
  }
};

module.exports = { applyMovement, validateMovementInput, validateSufficientStock, getOrCreateStock };
