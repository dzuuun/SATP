const {
  getTransactions,
  getTransactionsByStudent,
  getTransactionInfoById,
  getCommentByTransactionId,
  addTransaction,
  submitRating,
  submitCommentStatus
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

  getTransactionsByStudent: (req, res) => {
    const body = req.params;
    getTransactionsByStudent(body, (err, results) => {
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
        message: "Student's Subjects retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getTransactionInfoById: (req, res) => {
    const id = req.params.id;
    getTransactionInfoById(id, (err, results) => {
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

  submitRating: (req, res) => {
    const body = req.body;
    submitRating(body, (err, results) => {
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
        message: "Rating added successfully.",
        data: results,
      });
    });
  },

  submitCommentStatus: (req, res) => {
    const body = req.body;
    submitCommentStatus(body, (err, results) => {
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
        message: "Subject rated successfully. Thank you for your participation.",
        data: results,
      });
    });
  },
};
