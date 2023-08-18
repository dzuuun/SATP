const { getOverallRanking, getCollegiateRanking, getDepartmentalRanking } = require("./ranking.model");

module.exports = {
  getOverallRanking: (req, res) => {
    const body = req.body;
    getOverallRanking(body, (err, results) => {
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
        message: "Overall ranking retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getCollegiateRanking: (req, res) => {
    const body = req.body;
    getCollegiateRanking(body, (err, results) => {
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
        message: "Collegiate ranking retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getDepartmentalRanking: (req, res) => {
    const body = req.body;
    getDepartmentalRanking(body, (err, results) => {
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
        message: "Departmental ranking retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },
};