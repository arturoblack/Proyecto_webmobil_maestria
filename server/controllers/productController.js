const Product = require("../models/Product");
const Stock = require("../models/Stock");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// RF-04 — el stock NO se edita aquí: solo cambia mediante movimientos
const listProducts = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
    ];
  }
  if (category) filter.category = category;
  const products = await Product.find(filter).sort({ name: 1 });
  res.json(products);
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category, price, description } = req.body;
  const product = await Product.create({ name, sku, category, price, description });
  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const { name, category, price, description } = req.body;
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, category, price, description },
    { new: true, runValidators: true }
  );
  if (!product) throw ApiError.notFound("Producto no encontrado");
  res.json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const hasStock = await Stock.exists({ product: req.params.id, quantity: { $gt: 0 } });
  if (hasStock) {
    throw ApiError.conflict("No se puede eliminar un producto con existencias; registra su salida primero");
  }
  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound("Producto no encontrado");
  await Stock.deleteMany({ product: req.params.id });
  res.json({ message: "Producto eliminado correctamente" });
});

module.exports = { listProducts, createProduct, updateProduct, deleteProduct };
