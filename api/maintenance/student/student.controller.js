const bcrypt = require("bcrypt");
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

// Override addStudent
const originalAddStudent = controller.addStudent;

controller.addStudent = async (req, res) => {
  try {
    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    return originalAddStudent(req, res);
  } catch (err) {
    return res.status(500).json({
      success: 0,
      message: err.message,
    });
  }
};

module.exports = controller;