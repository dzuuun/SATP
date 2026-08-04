const model = require("./gsitem.model");
const {
  createMaintenanceController,
  input,
} = require("../shared/controller_factory");

module.exports = createMaintenanceController(model, {
  getAllItems: {
    method: "getAllItems",
    type: "list",
    message: "Graduate-school items retrieved successfully.",
  },
  getActiveItems: {
    method: "getActiveItems",
    type: "list",
    message: "Active graduate-school items retrieved successfully.",
  },
  getActiveStarRatingItems: {
    method: "getActiveStarRatingItems",
    type: "list",
    message: "Active star-rating items retrieved successfully.",
  },
  getActiveCommentsItems: {
    method: "getActiveCommentsItems",
    type: "list",
    message: "Active comment items retrieved successfully.",
  },
  getItemById: {
    method: "getItemById",
    type: "one",
    input: input.id,
    message: "Graduate-school item retrieved successfully.",
  },
  addItem: {
    method: "addItem",
    type: "create",
    input: input.body,
    status: 201,
    message: "Graduate-school item added successfully.",
    duplicateMessage: "Graduate-school item already exists.",
  },
  updateItem: {
    method: "updateItem",
    type: "update",
    input: input.body,
    includeData: false,
    message: "Graduate-school item updated successfully.",
  },
  submitComment: {
    method: "submitComment",
    type: "create",
    input: input.body,
    status: 201,
    message: "Comment submitted successfully.",
    duplicateMessage: "Comment already exists.",
  },
});
