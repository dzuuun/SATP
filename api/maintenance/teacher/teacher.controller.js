const {
  getTeachers,
  getTeacherById,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  searchTeachers,
} = require("./teacher.model");

module.exports = {
  getTeachers: (req, res) => {
    getTeachers((err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "Teachers information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getTeacherById: (req, res) => {
    const id = req.params.id;
    getTeacherById(id, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "Teacher information retrieved successfully.",
        data: results,
      });
    });
  },

  addTeacher: (req, res) => {
    const body = req.body;
    addTeacher(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "Teacher already exists. Try again.",
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
        message: "Teacher added successfully.",
        data: results,
      });
    });
  },

  updateTeacher: (req, res) => {
    const body = req.body;
    updateTeacher(body, (err, results) => {
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
        message: "Teacher information updated successfully.",
      });
    });
  },

  deleteTeacher: (req, res) => {
    const data = req.body;
    deleteTeacher(data, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.affectedRows == 0) {
        return res.json({
          success: 0,
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "Teacher deleted successfully.",
      });
    });
  },

  searchTeachers: (req, res) => {
    const body = req.body;
    searchTeachers(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.length === 0) {
        return res.json({
          success: 0,
          message: "No entry found.",
        });
      }
      return res.json({
        success: 1,
        message: "Teachers searched successfully.",
        count: results.length,
        data: results,
      });
    });
  },
};
