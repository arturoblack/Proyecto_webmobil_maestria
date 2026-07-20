const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middlewares/auth");
const { listProducts, createProduct, updateProduct, deleteProduct } = require("../controllers/productController");

router.use(verifyToken);
router.get("/", listProducts);
router.post("/", requireAdmin, createProduct);
router.put("/:id", requireAdmin, updateProduct);
router.delete("/:id", requireAdmin, deleteProduct);

module.exports = router;
