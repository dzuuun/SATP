const {
  getAllCategory,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  SearchCategory,
} = require("./category.model");

module.exports = {
  getAllCategory: (req, res) => {
    getAllCategory((err, results) => {
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
        message: "Category Information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getCategoryById: (req, res) => {
    const id = req.params.id;
    getCategoryById(id, (err, results) => {
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
        message: "Category information retrieved successfully.",
        data: results,
      });
    });
  },

  addCategory: (req, res) => {
    const body = req.body;
    addCategory(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "Category already exists. Try again.",
        });
      }
      if (results === undefined) {
        return res.status(500).json({
          success: 0,
          message: "Some fields are missing or the format is incorrect.",
        });
      }
      return res.json({
        success: 1,
        message: "Category added successfully.",
        data: results,
      });
    });
  },

  updateCategory: (req, res) => {
    const body = req.body;
    updateCategory(body, (err, results) => {
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
        message: "Category information updated successfully.",
      });
    });
  },

  deleteCategory: (req, res) => {
    const data = req.body;
    deleteCategory(data, (err, results) => {
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
        message: "Category deleted successfully.",
      });
    });
  },

  SearchCategory: (req, res) => {
    const body = req.body;
    SearchCategory(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.length === 0) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Categories searched successfully.",
        count: results.length,
        data: results,
      });
    });
  },
};
