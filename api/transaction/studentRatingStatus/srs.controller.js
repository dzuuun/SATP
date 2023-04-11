const { getTransactions, addTransaction } = require("./srs.model");

module.exports = {
  getTransactions: (req, res) => {
    getTransactions((err, results) => {
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
        message: "Items information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },
  
  addTransaction: (req, res) => {
    const body = req.body;
    addTransaction(body, (err, results) => {
      if (err) {
        console.log(err);
        return res.json({
          success: 0,
          message: "Transaction already exists. Try again.",
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
        message: "Transaction added successfully.",
        data: results,
      });
    });
  },

};
