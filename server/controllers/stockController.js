const Stock = require("../models/Stock");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// RF-05 y RF-06 — consulta de existencias por ubicación con alertas de mínimo
const listStock = asyncHandler(async (req, res) => {
  const { locationId, lowStock } = req.query;
  const filter = {};
  if (locationId) filter.location = locationId;
  if (lowStock === "true") filter.$expr = { $lte: ["$quantity", "$minStock"] };

  const stocks = await Stock.find(filter)
    .populate("product", "name sku category price")
    .populate("location", "name type")
    .sort({ updatedAt: -1 });
  res.json(stocks);
});

// Ajuste del umbral mínimo de un par producto–ubicación (no toca la cantidad)
const updateMinStock = asyncHandler(async (req, res) => {
  const stock = await Stock.findByIdAndUpdate(
    req.params.id,
    { minStock: req.body.minStock },
    { new: true, runValidators: true }
  ).populate("product location");
  if (!stock) throw ApiError.notFound("Registro de existencias no encontrado");
  res.json(stock);
});

module.exports = { listStock, updateMinStock };
