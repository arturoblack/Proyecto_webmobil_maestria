const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middlewares/auth");
const {
  listPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} = require("../controllers/purchaseOrderController");

router.use(verifyToken, requireAdmin);
router.get("/", listPurchaseOrders);
router.post("/", createPurchaseOrder);
router.post("/:id/receive", receivePurchaseOrder);
router.post("/:id/cancel", cancelPurchaseOrder);

module.exports = router;
