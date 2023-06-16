const {
  getAllAdmin,
  getAllActiveAdmin,
  getAdminById,
  addAdmin,
  updateAdminInfo,
  updateAdminActiveStatus,
  deleteAdmin,
} = require("./admin.controller");
const router = require("express").Router();

router.get("/", getAllAdmin);
router.get("/all/active", getAllActiveAdmin);
router.get("/:id", getAdminById);
router.post("/add", addAdmin);
router.put("/update/info", updateAdminInfo);
router.put("/update/status", updateAdminActiveStatus);
router.delete("/delete", deleteAdmin);

module.exports = router;
