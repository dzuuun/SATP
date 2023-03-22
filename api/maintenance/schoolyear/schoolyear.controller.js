const {
  getSchoolYears,
  getSchoolYearById,
  addSchoolYear,
  updateSchoolYear,
  // deleteSchoolYear,
} = require("./schoolyear.model");

module.exports = {
  getSchoolYears: (req, res) => {
    getSchoolYears((err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.status(500).json({
          success: 0,
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "School Years information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getSchoolYearById: (req, res) => {
    const id = req.params.id;
    getSchoolYearById(id, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.status(500).json({
          success: 0,
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "School Year information retrieved successfully.",
        data: results,
      });
    });
  },

  addSchoolYear: (req, res) => {
    const body = req.body;
    addSchoolYear(body, (err, results) => {
      if (err) {
        return res.status(500).json({
          success: 0,
          message: "School Year already exists. Try again.",
        });
      }
      return res.json({
        success: 1,
        message: "School Year added successfully.",
        data: results,
      });
    });
  },

  updateSchoolYear: (req, res) => {
    const body = req.body;
    updateSchoolYear(body, (err, results) => {
      if (err) {
        console.log(err);
        return false;
      }
      if (results.changedRows == 0) {
        return res.status(500).json({
          success: 0,
          message: "Contents are still the same.",
        });
      }
      return res.json({
        success: 1,
        message: "School Year information updated successfully.",
      });
    });
  },
  // deleteSchoolYear: (req, res) => {
  //   const data = req.body;
  //   deleteSchoolYear(data, (err, results) => {
  //     if (err) {
  //       console.log(err);
  //       return;
  //     }
  //     if (results.affectedRows == 0) {
  //       return res.status(500).json({
  //         success: 0,
  //         message: "Record not found.",
  //       });
  //     }
  //     return res.json({
  //       success: 1,
  //       message: "School Year deleted successfully.",
  //     });
  //   });
  // },
};
