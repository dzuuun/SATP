const {
  getSubjects,
  getSubjectById,
  addSubject,
  updateSubject,
  deleteSubject,
} = require("./subjects.model");

module.exports = {
  getSubjects: (req, res) => {
    getSubjects((err, results) => {
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
        message: "Subjects information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getSubjectById: (req, res) => {
    const id = req.params.id;
    getSubjectById(id, (err, results) => {
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
        message: "Subject information retrieved successfully.",
        data: results,
      });
    });
  },

  addSubject: (req, res) => {
    const body = req.body;
    addSubject(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "Subject already exists. Try again.",
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
        message: "Subject added successfully.",
        data: results,
      });
    });
  },

  updateSubject: (req, res) => {
    const body = req.body;
    updateSubject(body, (err, results) => {
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
        message: "Subject information updated successfully.",
      });
    });
  },

  deleteSubject: (req, res) => {
    const body = req.body;
    deleteSubject(body, (err, results) => {
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
        message: "Subject deleted successfully.",
      });
    });
  },
};
