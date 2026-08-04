const model = require("./item.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "Item",
  plural: "Items",
  actions: {
    getAllItems: ["getAllItems", "list"],
    getActiveItems: ["getActiveItems", "active"],
    getItemById: ["getItemById", "one", "id"],
    addItem: ["addItem", "create", "body"],
    updateItem: ["updateItem", "update", "body"],
    deleteItem: ["deleteItem", "delete", "body"],
  },
});
