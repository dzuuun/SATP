const model = require("./admin.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "Admin",
  plural: "Admins",
  actions: {
    getAllAdmin: ["getAllAdmin", "list"],
    getAllActiveAdmin: ["getAllActiveAdmin", "active"],
    getAdminById: ["getAdminById", "one", "id"],
    addAdmin: ["addAdmin", "create", "body"],
    updateAdminInfo: ["updateAdminInfo", "update", "body"],
    updateAdminActiveStatus: ["updateAdminActiveStatus", "update", "body"],
    deleteAdmin: ["deleteAdmin", "delete", "body"],
  },
});
