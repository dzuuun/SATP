const {
  getDepartments,
  getDepartmentById,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  searchDepartments,
} = require("./department.controller");
const router = require("express").Router();

router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.post("/new", addDepartment);
router.put("/update", updateDepartment);
router.delete("/delete", deleteDepartment);
router.get("/search/any", searchDepartments);

module.exports = router;
