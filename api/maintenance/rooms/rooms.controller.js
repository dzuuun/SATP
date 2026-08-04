const model = require("./rooms.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "Room",
  plural: "Rooms",
  actions: {
    getRooms: ["getRooms", "list"],
    getActiveRooms: ["getActiveRooms", "active"],
    getRoomById: ["getRoomById", "one", "id"],
    getRoomByCode: ["getRoomByCode", "one", "body"],
    addRoom: ["addRoom", "create", "body"],
    updateRoom: ["updateRoom", "update", "body"],
  },
});
