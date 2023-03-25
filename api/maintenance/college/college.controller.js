const { getColleges, getCollegeById, addCollege, updateCollege, deleteCollege,searchColleges } = require("./college.model");

module.exports = {
  getColleges: (req, res) => {
    getColleges((err, results) => {
      if (!results) {
        return res.status(500).json({
          success: 0,
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "Colleges information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getCollegeById: (req, res) => {
    const id = req.params.id;
    getCollegeById(id, (err, results) => {
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
        message: "College information retrieved successfully.",
        data: results,
      });
    });
  },

  addCollege: (req, res) => {
    const body = req.body;
    addCollege(body, (err, results) => {
      if (err) {
        return res.status(500).json({
          success: 0,
          message: "College already exists. Try again.",
        });
      }
      return res.json({
        success: 1,
        message: "College added successfully.",
        data: results,
      });
    });
  },
  updateCollege: (req, res) => {
    const body = req.body;
    updateCollege(body, (err, results) => {
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
        message: "College information updated successfully.",
      });
    });
  },

  deleteCollege: (req, res) => {
    const data = req.body;
    deleteCollege(data, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.affectedRows == 0) {
        return res.status(500).json({
          success: 0,
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "College deleted successfully.",
      });
    });
  },

  searchColleges: (req, res) => {
    const body = req.body;
    searchColleges(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.length === 0) {
        return res.status(500).json({
          success: 0,
          message: "No entry found.",
        });
      }
      return res.json({
        success: 1,
        message: "Colleges searched successfully.",
        count: results.length,
        data: results,
      });
    });
  },
};