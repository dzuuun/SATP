const {
  getSemesters,
  getActiveSemesters,
  getInUseSemester,
  getSemesterById,
  addSemester,
  updateSemester,
  deleteSemester,
} = require("./semester.model");

module.exports = {
  getSemesters: (req, res) => {
    getSemesters((err, results) => {
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
        message: "Semesters information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getActiveSemesters: (req, res) => {
    getActiveSemesters((err, results) => {
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
        message: "Semesters information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getInUseSemester: (req, res) => {
    getInUseSemester((err, results) => {
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
        message: "Semesters information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },


  getSemesterById: (req, res) => {
    const id = req.params.id;
    getSemesterById(id, (err, results) => {
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
        message: "Semester information retrieved successfully.",
        data: results,
      });
    });
  },

  addSemester: (req, res) => {
    const body = req.body;
    addSemester(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "Semester already exists. Try again.",
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
        message: "Semester added successfully.",
        data: results,
      });
    });
  },

  updateSemester: (req, res) => {
    const body = req.body;
    updateSemester(body, (err, results) => {
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
        message: "Semester information updated successfully.",
      });
    });
  },

  deleteSemester: (req, res) => {
    const body = req.body;
    deleteSemester(body, (err, results) => {
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
        message: "Semester deleted successfully.",
      });
    });
  },
};
