const {
  getAllStudent,
  getStudentById,
  addStudent,
  updateStudentInfo,
  updateStudentActiveStatus,
  deleteStudent,
} = require("./student.model");

module.exports = {
  getAllStudent: (req, res) => {
    getAllStudent((err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "List of students retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getStudentById: (req, res) => {
    const id = req.params.id;
    getStudentById(id, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Student retrieved successfully.",
        data: results,
      });
    });
  },

  addStudent: (req, res) => {
    const body = req.body;
    // const salt = genSaltSync(10);
    // body.password = hashSync(body.password, salt);
    addStudent(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "Student already exists. Try again.",
        });
      }
      if (results === undefined) {
        return res.status(500).json({
          success: 0,
          message: "Some fields are missing or incorrect format.",
        });
      }
      return res.json({
        success: 1,
        message: "Student added successfully.",
        data: results,
      });
    });
  },

  updateStudentInfo: (req, res) => {
    const body = req.body;
    updateStudentInfo(body, (err, results) => {
      if (err) {
        console.log(err);
        return false;
      }
      if (results.changedRows == 0) {
        return res.json({
          success: 0,
          message: "Contents are still the same.",
        });
      }
      return res.json({
        success: 1,
        message: "Student information updated successfully.",
      });
    });
  },

  updateStudentActiveStatus: (req, res) => {
    const body = req.body;
    updateStudentActiveStatus(body, (err, results) => {
      if (err) {
        console.log(err);
        return false;
      }
      if (results.changedRows == 0) {
        return res.json({
          success: 0,
          message: "Contents are still the same.",
        });
      }
      return res.json({
        success: 1,
        message: "Student's status updated successfully.",
      });
    });
  },

  deleteStudent: (req, res) => {
    const body = req.body;
    deleteStudent(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.affectedRows == 0) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Student deleted successfully.",
      });
    });
  },
};
