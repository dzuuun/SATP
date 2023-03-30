const {
  getPermissions,
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
router.put("/update", updatePermission);
router.get("/search/any", searchPermissions);
router.delete("/delete", deletePermission);

module.exports = router;
