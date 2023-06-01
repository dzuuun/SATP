const {
  addRoom,
  getRoomById,
  getRooms,
  updateRoom,
  deleteRoom,
} = require("./rooms.controller");
const router = require("express").Router();

router.post("/add", addRoom);
router.get("/:id", getRoomById);
router.get("/", getRooms);
router.put("/update", updateRoom);
router.delete("/delete", deleteRoom);

module.exports = router;
