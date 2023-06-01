const {
  getAllAdmin,
  getAdminById,
  addAdmin,
  updateAdminInfo,
  updateAdminUsername,
  deleteAdmin,
} = require("./admin.controller");
const router = require("express").Router();

router.get("/", getAllAdmin);
router.get("/:id", getAdminById);
router.post("/add", addAdmin);
router.put("/update/info", updateAdminInfo);
router.put("/update/username", updateAdminUsername);
router.delete("/delete", deleteAdmin);

module.exports = router;
