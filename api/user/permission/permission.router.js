const {
  getPermissions,
  getRaterId,
  getActivePermissions,
  getPermissionById,
  addPermission,
  updatePermission,
  deletePermission,
  searchPermissions,
} = require("./permission.controller");
const router = require("express").Router();

router.post("/add", addPermission);
router.get("/:id", getPermissionById);
router.get("/", getPermissions);
router.get("/all/active", getActivePermissions);
router.put("/update", updatePermission);
router.get("/search/any", searchPermissions);
router.delete("/delete", deletePermission);
router.get("/rater/id", getRaterId);

module.exports = router;
