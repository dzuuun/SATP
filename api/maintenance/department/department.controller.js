const model = require("./department.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "Department",
  plural: "Departments",
  actions: {
    getDepartments: ["getDepartments", "list"],
    getActiveDepartments: ["getActiveDepartments", "active"],
    getDepartmentById: ["getDepartmentById", "one", "id"],
    getDepartmentByCode: ["getDepartmentByCode", "one", "body"],
    addDepartment: ["addDepartment", "create", "body"],
    updateDepartment: ["updateDepartment", "update", "body"],
    deleteDepartment: ["deleteDepartment", "delete", "body"],
  },
});
