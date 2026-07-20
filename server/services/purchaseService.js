const mongoose = require("mongoose");
const PurchaseOrder = require("../models/PurchaseOrder");
const ApiError = require("../utils/ApiError");
const { applyMovement } = require("./inventoryService");

/**
 * Recepciona un pedido a proveedor: genera las entradas del kardex en la ubicación
 * de destino y marca el pedido como recibido, todo en una transacción.
 */
const receiveOrder = async (orderId, userId) => {
  const order = await PurchaseOrder.findById(orderId);
  if (!order) throw ApiError.notFound("Pedido a proveedor no encontrado");
  if (order.status !== "pendiente") {
    throw ApiError.conflict(`El pedido ya fue ${order.status}; solo se recepcionan pedidos pendientes`);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of order.items) {
        await applyMovement(
          {
            type: "entrada",
            productId: item.product,
            destinationId: order.destination,
            quantity: item.quantity,
            reason: `Recepción de pedido a ${order.supplierName}`,
            userId,
          },
          session
        );
      }
      order.status = "recibido";
      order.receivedAt = new Date();
      await order.save({ session });
    });
    // Igual que en la venta: sin await, el finally cierra la sesión antes del populate
    return await order.populate([
      { path: "items.product", select: "name sku" },
      { path: "destination", select: "name type" },
    ]);
  } finally {
    session.endSession();
  }
};

module.exports = { receiveOrder };
