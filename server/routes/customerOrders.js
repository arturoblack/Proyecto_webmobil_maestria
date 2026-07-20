const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth");
const {
  listCustomerOrders,
  createCustomerOrder,
  updateCustomerOrderStatus,
} = require("../controllers/customerOrderController");

router.use(verifyToken);
router.get("/", listCustomerOrders);
router.post("/", createCustomerOrder);
router.put("/:id/status", updateCustomerOrderStatus);

module.exports = router;
