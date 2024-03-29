const {
  getAllItems,
  getActiveItems,
  getItemById,
  addItem,
  updateItem,
  deleteItem,
} = require("./item.model");

module.exports = {
  getAllItems: (req, res) => {
    getAllItems((err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          here: "h",
          message: " No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Items retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getActiveItems: (req, res) => {
    getActiveItems((err, results) => {
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
        message: "Items retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getItemById: (req, res) => {
    const id = req.params.id;
    getItemById(id, (err, results) => {
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

  addItem: (req, res) => {
    const body = req.body;
    addItem(body, (err, results) => {
      if (err) {
        console.log(err);
        return res.json({
          success: 0,
          message: "Item already exists. Try again.",
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
        message: "Item added successfully.",
        data: results,
      });
    });
  },

  updateItem: (req, res) => {
    const body = req.body;
    updateItem(body, (err, results) => {
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
        message: "Item information updated succesfully.",
      });
    });
  },

  deleteItem: (req, res) => {
    const body = req.body;
    deleteItem(body, (err, results) => {
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
        message: "Item deleted successfully.",
      });
    });
  },
};
