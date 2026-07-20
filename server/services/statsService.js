const Stock = require("../models/Stock");
const Movement = require("../models/Movement");
const Sale = require("../models/Sale");
const CustomerOrder = require("../models/CustomerOrder");
const PurchaseOrder = require("../models/PurchaseOrder");

// Consolida las métricas del panel de control en una sola respuesta (RF-14)
const getDashboard = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [inventory, lowStock, todaySales, topProducts, recentMovements, pendingOrders] =
    await Promise.all([
      // Valor y unidades totales del inventario (precio del catálogo × existencias)
      Stock.aggregate([
        { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "p" } },
        { $unwind: "$p" },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: "$quantity" },
            inventoryValue: { $sum: { $multiply: ["$quantity", "$p.price"] } },
            products: { $addToSet: "$product" },
          },
        },
      ]),
      // Existencias en o bajo el mínimo, con producto y sede
      Stock.find({ $expr: { $lte: ["$quantity", "$minStock"] } })
        .populate("product", "name sku")
        .populate("location", "name type")
        .sort({ quantity: 1 })
        .limit(10),
      // Ventas del día (monto y unidades)
      Sale.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: null,
            amount: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } },
            units: { $sum: "$items.quantity" },
            sales: { $addToSet: "$_id" },
          },
        },
      ]),
      // Top 5 productos más vendidos en 30 días
      Movement.aggregate([
        { $match: { type: "venta", createdAt: { $gte: last30Days } } },
        { $group: { _id: "$product", totalSold: { $sum: "$quantity" } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "p" } },
        { $unwind: "$p" },
        { $project: { name: "$p.name", sku: "$p.sku", totalSold: 1 } },
      ]),
      Movement.find()
        .populate("product", "name sku")
        .populate("user", "name")
        .populate("origin destination", "name")
        .sort({ createdAt: -1 })
        .limit(8),
      Promise.all([
        CustomerOrder.countDocuments({ status: "pendiente" }),
        PurchaseOrder.countDocuments({ status: "pendiente" }),
      ]),
    ]);

  const inv = inventory[0] || { totalUnits: 0, inventoryValue: 0, products: [] };
  const sales = todaySales[0] || { amount: 0, units: 0, sales: [] };

  return {
    totalProducts: inv.products.length,
    totalUnits: inv.totalUnits,
    inventoryValue: Math.round(inv.inventoryValue * 100) / 100,
    lowStockCount: lowStock.length,
    lowStock,
    todaySales: { amount: Math.round(sales.amount * 100) / 100, units: sales.units, count: sales.sales.length },
    topProducts,
    recentMovements,
    pendingOrders: { customer: pendingOrders[0], purchase: pendingOrders[1] },
  };
};

module.exports = { getDashboard };
