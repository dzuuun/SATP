const {
  getDepartments,
  getDepartmentById,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} = require("./department.controller");
const router = require("express").Router();

router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.post("/add", addDepartment);
router.put("/update", updateDepartment);
router.delete("/delete", deleteDepartment);

module.exports = router;
