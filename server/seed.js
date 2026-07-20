/**
 * Datos de ejemplo para la demostración: usuarios, ubicaciones, catálogo y stock inicial.
 * Uso: npm run seed  (requiere .env con MONGO_URI y JWT_SECRET)
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Location = require("./models/Location");
const Product = require("./models/Product");
const Stock = require("./models/Stock");

const PRODUCTS = [
  { name: "Cuaderno Loro 92 h. cuadriculado", sku: "CUA-LOR-92", category: "Cuadernos", price: 4.5 },
  { name: "Cuaderno Standford 100 h. rayado", sku: "CUA-STA-100", category: "Cuadernos", price: 6.9 },
  { name: "Lápiz Mongol N°2", sku: "LAP-MON-02", category: "Escritura", price: 1.2 },
  { name: "Lapicero Faber-Castell 034 azul", sku: "LPC-FAB-034", category: "Escritura", price: 1.0 },
  { name: "Borrador blanco", sku: "BOR-BLA-01", category: "Escritura", price: 1.5 },
  { name: "Colores Faber-Castell x12", sku: "COL-FAB-12", category: "Arte", price: 18.9 },
  { name: "Plumones Artesco x10", sku: "PLU-ART-10", category: "Arte", price: 12.9 },
  { name: "Témpera Artesco x7", sku: "TEM-ART-07", category: "Arte", price: 8.5 },
  { name: "Folder manila A4 con fastener", sku: "FOL-MAN-A4", category: "Papelería", price: 0.8 },
  { name: "Papel bond A4 75 g (millar)", sku: "PAP-BON-A4", category: "Papelería", price: 24.0 },
];

// Stock inicial [unidades en almacén, unidades en tienda, mínimo]
const INITIAL_STOCK = {
  "CUA-LOR-92": [140, 3, 10],
  "CUA-STA-100": [90, 25, 10],
  "LAP-MON-02": [480, 6, 24],
  "LPC-FAB-034": [350, 60, 30],
  "BOR-BLA-01": [200, 38, 15],
  "COL-FAB-12": [56, 22, 8],
  "PLU-ART-10": [72, 15, 8],
  "TEM-ART-07": [44, 4, 12],
  "FOL-MAN-A4": [320, 95, 40],
  "PAP-BON-A4": [2, 9, 5],
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.info("Conectado. Limpiando colecciones de demostración…");
  await Promise.all([User.deleteMany(), Location.deleteMany(), Product.deleteMany(), Stock.deleteMany()]);

  const [admin, seller] = await User.create([
    { username: "admin", name: "Iván Bolaños", password: await bcrypt.hash("admin123", 10), role: "admin" },
    { username: "rosa", name: "Rosa Quispe", password: await bcrypt.hash("rosa123", 10), role: "vendedor" },
  ]);

  const [warehouse, store] = await Location.create([
    { name: "Almacén Central", type: "almacen" },
    { name: "Tienda Jr. Lima", type: "tienda" },
  ]);

  const products = await Product.create(PRODUCTS);

  const stocks = [];
  for (const product of products) {
    const [wQty, sQty, minStock] = INITIAL_STOCK[product.sku];
    stocks.push(
      { product: product._id, location: warehouse._id, quantity: wQty, minStock },
      { product: product._id, location: store._id, quantity: sQty, minStock }
    );
  }
  await Stock.create(stocks);

  console.info("======================================");
  console.info("🎉 Datos de ejemplo creados");
  console.info(`   Admin:    ${admin.username} / admin123`);
  console.info(`   Vendedor: ${seller.username} / rosa123`);
  console.info(`   Sedes: ${warehouse.name} y ${store.name}`);
  console.info(`   ${products.length} productos con stock en ambas sedes`);
  console.info("======================================");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Error en el seed:", err);
  process.exit(1);
});
