const model = require("./subjects.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "Course",
  plural: "Courses",
  actions: {
    getSubjects: ["getSubjects", "list"],
    getActiveSubjects: ["getActiveSubjects", "active"],
    getSubjectById: ["getSubjectById", "one", "id"],
    getSubjectByCode: ["getSubjectByCode", "one", "body"],
    addSubject: ["addSubject", "create", "body"],
    updateSubject: ["updateSubject", "update", "body"],
    deleteSubject: ["deleteSubject", "delete", "body"],
  },
});
