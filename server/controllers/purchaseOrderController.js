const PurchaseOrder = require("../models/PurchaseOrder");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { receiveOrder } = require("../services/purchaseService");

const ORDER_POPULATE = [
  { path: "items.product", select: "name sku" },
  { path: "destination", select: "name type" },
  { path: "user", select: "name" },
];

// RF-11 — pedidos a proveedor (solo administrador; la ruta aplica requireAdmin)
const listPurchaseOrders = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const orders = await PurchaseOrder.find(filter).populate(ORDER_POPULATE).sort({ createdAt: -1 });
  res.json(orders);
});

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { supplierName, items, destinationId } = req.body;
  const order = await PurchaseOrder.create({
    supplierName,
    items: (items || []).map((i) => ({ product: i.productId, quantity: Number(i.quantity) })),
    destination: destinationId,
    user: req.user.id,
  });
  res.status(201).json(await order.populate(ORDER_POPULATE));
});

// RF-12 — recepción: genera las entradas automáticas del kardex
const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const order = await receiveOrder(req.params.id, req.user.id);
  res.json(order);
});

const cancelPurchaseOrder = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) throw ApiError.notFound("Pedido a proveedor no encontrado");
  if (order.status !== "pendiente") {
    throw ApiError.conflict("Solo se pueden cancelar pedidos pendientes");
  }
  order.status = "cancelado";
  await order.save();
  res.json(await order.populate(ORDER_POPULATE));
});

module.exports = { listPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder };
