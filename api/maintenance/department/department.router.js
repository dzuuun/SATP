const {
  getDepartments,
  getActiveDepartments,
  getDepartmentById,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} = require("./department.controller");
const router = require("express").Router();

router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.get("/all/active", getActiveDepartments);
router.post("/add", addDepartment);
router.put("/update", updateDepartment);
router.delete("/delete", deleteDepartment);

module.exports = router;
