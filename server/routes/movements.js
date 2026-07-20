const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middlewares/auth");
const { listMovements, createMovement } = require("../controllers/movementController");

router.use(verifyToken);
router.get("/", listMovements);
router.post("/", requireAdmin, createMovement);

module.exports = router;
