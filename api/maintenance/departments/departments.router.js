const {
    addDepartment,
    getDepartmentById,
    getDepartments,
    updateDepartment,
    // deleteDepartment
  } = require("./Departments.controller");
  const router = require("express").Router();
  
  router.post("/add", addDepartment);
  router.get("/:id", getDepartmentById);
  router.get("/", getDepartments);
  router.put("/update", updateDepartment);
  // router.delete("/delete", deleteDepartment)
  
  module.exports = router;
  