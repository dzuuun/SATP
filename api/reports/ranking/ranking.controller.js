const { getOverallRanking, getCollegiateRanking, getDepartmentalRanking } = require("./ranking.model");

module.exports = {
  getOverallRanking: (req, res) => {
    const query = req.params;
    getOverallRanking(query, (err, results) => {
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
    const query = req.params;
    getCollegiateRanking(query, (err, results) => {
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
    const query = req.params;
    getDepartmentalRanking(query, (err, results) => {
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
