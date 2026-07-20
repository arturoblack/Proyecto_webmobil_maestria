const CustomerOrder = require("../models/CustomerOrder");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const ORDER_POPULATE = [
  { path: "items.product", select: "name sku price" },
  { path: "location", select: "name" },
  { path: "user", select: "name" },
];

// RF-10 — encargos de clientes; no afectan el stock
const listCustomerOrders = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const orders = await CustomerOrder.find(filter).populate(ORDER_POPULATE).sort({ createdAt: -1 });
  res.json(orders);
});

const createCustomerOrder = asyncHandler(async (req, res) => {
  const { customerName, phone, items, locationId, notes } = req.body;
  const order = await CustomerOrder.create({
    customerName,
    phone,
    items: (items || []).map((i) => ({ product: i.productId, quantity: Number(i.quantity) })),
    location: locationId,
    notes,
    user: req.user.id,
  });
  res.status(201).json(await order.populate(ORDER_POPULATE));
});

const updateCustomerOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["pendiente", "entregado", "cancelado"].includes(status)) {
    throw ApiError.badRequest("El estado debe ser pendiente, entregado o cancelado");
  }
  const order = await CustomerOrder.findByIdAndUpdate(req.params.id, { status }, { new: true })
    .populate(ORDER_POPULATE);
  if (!order) throw ApiError.notFound("Pedido de cliente no encontrado");
  res.json(order);
});

module.exports = { listCustomerOrders, createCustomerOrder, updateCustomerOrderStatus };
