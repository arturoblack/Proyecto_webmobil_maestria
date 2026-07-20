const Sale = require("../models/Sale");
const asyncHandler = require("../utils/asyncHandler");
const { processSale } = require("../services/salesService");

// RF-13 — punto de venta con pago simulado
const listSales = asyncHandler(async (req, res) => {
  const sales = await Sale.find()
    .populate("items.product", "name sku")
    .populate("location", "name")
    .populate("user", "name")
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(sales);
});

const createSale = asyncHandler(async (req, res) => {
  const { locationId, items, payment } = req.body;
  const sale = await processSale({ locationId, items, payment, userId: req.user.id });
  res.status(201).json(sale);
});

module.exports = { listSales, createSale };
