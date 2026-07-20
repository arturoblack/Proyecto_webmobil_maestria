const router = require("express").Router();
const { verifyToken } = require("../middlewares/auth");
const { dashboard } = require("../controllers/statsController");

router.get("/", verifyToken, dashboard);

module.exports = router;
