const {
    addDepartment,
    getDepartmentById,
    getDepartments,
    updateDepartment,
    deleteDepartment,
    searchDepartments
  } = require("./Departments.controller");
  const router = require("express").Router();
  
  router.post("/add", addDepartment);
  router.get("/:id", getDepartmentById);
  router.get("/", getDepartments);
  router.put("/update", updateDepartment);
  router.delete("/delete", deleteDepartment);
  router.get("/search/any", searchDepartments);
  
  module.exports = router;
  