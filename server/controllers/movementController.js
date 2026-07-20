const Movement = require("../models/Movement");
const asyncHandler = require("../utils/asyncHandler");
const { applyMovement } = require("../services/inventoryService");

// RF-09 — kardex
const listMovements = asyncHandler(async (req, res) => {
  const { type, productId, limit } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (productId) filter.product = productId;

  const movements = await Movement.find(filter)
    .populate("product", "name sku")
    .populate("user", "name")
    .populate("origin destination", "name type")
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500));
  res.json(movements);
});

// RF-07 y RF-08 — entradas, salidas y transferencias manuales (solo administrador)
const createMovement = asyncHandler(async (req, res) => {
  const { type, productId, originId, destinationId, quantity, reason } = req.body;
  const movement = await applyMovement({
    type,
    productId,
    originId,
    destinationId,
    quantity: Number(quantity),
    reason,
    userId: req.user.id,
  });
  const populated = await movement.populate([
    { path: "product", select: "name sku" },
    { path: "origin destination", select: "name type" },
  ]);
  res.status(201).json(populated);
});

module.exports = { listMovements, createMovement };
