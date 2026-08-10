const model = require("./student.model");
const { createStandardController } = require("../shared/controller_factory");

const controller = createStandardController(model, {
  entity: "Student",
  plural: "Students",
  actions: {
    getAllStudent: ["getAllStudent", "list"],
    getAllActiveStudent: ["getAllActiveStudent", "active"],
    getStudentById: ["getStudentById", "one", "id"],
    getStudentByUserName: ["getStudentByUserName", "one", "body"],
    addStudent: ["addStudent", "create", "body"],
    updateStudentInfo: ["updateStudentInfo", "update", "body"],
    updateStudentActiveStatus: ["updateStudentActiveStatus", "update", "body"],
    deleteStudent: ["deleteStudent", "delete", "body"],
  },
});

module.exports = controller;
