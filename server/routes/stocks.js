const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middlewares/auth");
const { listStock, updateMinStock } = require("../controllers/stockController");

router.use(verifyToken);
router.get("/", listStock);
router.put("/:id/min-stock", requireAdmin, updateMinStock);

module.exports = router;
