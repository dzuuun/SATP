const {
  getAllItems,
  getActiveItems,
  getActiveStarRatingItems,
  getActiveCommentsItems,
  getItemById,
  addItem,
  updateItem,
  submitComment,
} = require("./gsitem.controller");
const router = require("express").Router();
const { requirePermission } = require("../../../auth/auth_validation");
const requireMaintenanceAccess = requirePermission("maintenance_access");

router.post("/add", requireMaintenanceAccess, addItem);
router.get("/:id", getItemById);
router.get("/", getAllItems);
router.get("/active/rate", getActiveItems);
router.get("/active/starrating/rate", getActiveStarRatingItems);
router.get("/active/comment/rate", getActiveCommentsItems);
router.put("/update", requireMaintenanceAccess, updateItem);
router.post("/add/comment", submitComment);
module.exports = router;
