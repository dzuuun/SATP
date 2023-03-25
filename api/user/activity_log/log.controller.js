const { getLog, searchLogs } = require("./log.model");

module.exports = {
  getLog: (req, res) => {
    getLog((err, results) => {
      if (!results) {
        return res.json({
          success: 0,
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "Activity logs retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  
  searchLogs: (req, res) => {
    const body = req.body;
    searchLogs(body, (err, results) => {
        if (err) {
            console.log(err);
            return;
        }
        if (results.length === 0) {
            return res.json({
                success: 0,
                message: "No entry found."
            });
        }
        return res.json({
            success: 1,
            message: "Activity logs searched successfully.",
            count: results.length,
            data: results
        });
    });
},
};
