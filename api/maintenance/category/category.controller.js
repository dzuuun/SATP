const model = require("./category.model");
const {
  createMaintenanceController,
  input,
} = require("../shared/controller_factory");

module.exports = createMaintenanceController(model, {
  getAllCategory: {
    method: "getAllCategory",
    type: "list",
    message: "Categories retrieved successfully.",
  },
  getAllActiveCategory: {
    method: "getAllActiveCategory",
    type: "list",
    message: "Active categories retrieved successfully.",
  },
  getCategoryById: {
    method: "getCategoryById",
    type: "one",
    input: input.id,
    message: "Category retrieved successfully.",
  },
  addCategory: {
    method: "addCategory",
    type: "create",
    input: input.body,
    status: 201,
    message: "Category added successfully.",
    duplicateMessage: "Category already exists.",
  },
  updateCategory: {
    method: "updateCategory",
    type: "update",
    input: input.body,
    includeData: false,
    message: "Category updated successfully.",
  },
  deleteCategory: {
    method: "deleteCategory",
    type: "delete",
    input: input.body,
    includeData: false,
    message: "Category deleted successfully.",
  },
});
