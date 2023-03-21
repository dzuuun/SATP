const {
  addRoom,
  getRoomById,
  getRooms,
  updateRoom,
} = require("./Rooms.controller");
const router = require("express").Router();

router.post("/add", addRoom);
router.get("/:id", getRoomById);
router.get("/", getRooms);
router.put("/update", updateRoom);

module.exports = router;
