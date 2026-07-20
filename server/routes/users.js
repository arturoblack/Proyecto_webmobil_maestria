const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middlewares/auth");
const { listUsers, createUser, deleteUser } = require("../controllers/userController");

router.use(verifyToken, requireAdmin);
router.get("/", listUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);

module.exports = router;
