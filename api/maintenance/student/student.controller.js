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

function scopedStudentList(method, message) {
  return (req, res) => {
    method({ requesting_user_id: req.user.id }, (error, results) => {
      if (error) {
        console.error("Unable to retrieve scoped students:", error);
        return res.status(500).json({
          success: 0,
          message: "Unable to retrieve students.",
        });
      }
      const data = results || [];
      return res.json({ success: 1, message, count: data.length, data });
    });
  };
}

controller.getAllStudent = scopedStudentList(
  model.getAllStudent,
  "Students retrieved successfully.",
);
controller.getAllActiveStudent = scopedStudentList(
  model.getAllActiveStudent,
  "Active students retrieved successfully.",
);

module.exports = controller;
