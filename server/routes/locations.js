const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middlewares/auth");
const { listLocations, createLocation, updateLocation, deleteLocation } = require("../controllers/locationController");

router.use(verifyToken);
router.get("/", listLocations);
router.post("/", requireAdmin, createLocation);
router.put("/:id", requireAdmin, updateLocation);
router.delete("/:id", requireAdmin, deleteLocation);

module.exports = router;
