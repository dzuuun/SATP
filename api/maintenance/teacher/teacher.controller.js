const model = require("./teacher.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "Teacher",
  plural: "Teachers",
  actions: {
    getTeachers: ["getTeachers", "list"],
    getActiveTeachers: ["getActiveTeachers", "active"],
    getTeacherById: ["getTeacherById", "one", "id"],
    getTeacherByName: ["getTeacherByName", "one", "body"],
    addTeacher: ["addTeacher", "create", "body"],
    updateTeacher: ["updateTeacher", "update", "body"],
    activateTeacher: ["activateTeacher", "update", "body"],
    deleteTeacher: ["deleteTeacher", "delete", "body"],
  },
});
