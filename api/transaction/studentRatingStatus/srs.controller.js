const {
  getTransactions,
  getRatingsByTransactionId,
  getCommentByTransactionId,
  addTransaction,
} = require("./srs.model");

module.exports = {
  getTransactions: (req, res) => {
    const body = req.params;
    getTransactions(body, (err, results) => {
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

  getRatingsByTransactionId: (req, res) => {
    const id = req.params.id;
    getRatingsByTransactionId(id, (err, results) => {
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
        message: "Item retrieved successfully.",
        data: results,
      });
    });
  },

  getCommentByTransactionId: (req, res) => {
    const id = req.params.id;
    getCommentByTransactionId(id, (err, results) => {
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
        message: "Item retrieved successfully.",
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
