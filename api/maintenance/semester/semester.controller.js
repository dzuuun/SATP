const model = require("./semester.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "Semester",
  plural: "Semesters",
  actions: {
    getSemesters: ["getSemesters", "list"],
    getActiveSemesters: ["getActiveSemesters", "active"],
    getInUseSemester: ["getInUseSemester", "list"],
    getSemesterById: ["getSemesterById", "one", "id"],
    addSemester: ["addSemester", "create", "body"],
    updateSemester: ["updateSemester", "update", "body"],
    deleteSemester: ["deleteSemester", "delete", "body"],
  },
});
