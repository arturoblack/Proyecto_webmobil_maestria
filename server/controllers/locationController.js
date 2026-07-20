const Location = require("../models/Location");
const Stock = require("../models/Stock");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// RF-03 — gestión de almacenes y tiendas
const listLocations = asyncHandler(async (req, res) => {
  const locations = await Location.find().sort({ type: 1, name: 1 });
  res.json(locations);
});

const createLocation = asyncHandler(async (req, res) => {
  const location = await Location.create({ name: req.body.name, type: req.body.type });
  res.status(201).json(location);
});

const updateLocation = asyncHandler(async (req, res) => {
  const location = await Location.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name, type: req.body.type },
    { new: true, runValidators: true }
  );
  if (!location) throw ApiError.notFound("Ubicación no encontrada");
  res.json(location);
});

const deleteLocation = asyncHandler(async (req, res) => {
  const hasStock = await Stock.exists({ location: req.params.id, quantity: { $gt: 0 } });
  if (hasStock) {
    throw ApiError.conflict("No se puede eliminar una ubicación con existencias; transfiere el stock primero");
  }
  const deleted = await Location.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound("Ubicación no encontrada");
  await Stock.deleteMany({ location: req.params.id });
  res.json({ message: "Ubicación eliminada correctamente" });
});

module.exports = { listLocations, createLocation, updateLocation, deleteLocation };
