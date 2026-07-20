const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth");
const { listSales, createSale } = require("../controllers/saleController");

router.use(verifyToken);
router.get("/", listSales);
router.post("/", createSale);

module.exports = router;
