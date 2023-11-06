const {
  addRoom,
  getRoomById,
  getRoomByCode,
  getRooms,
  updateRoom,
  // deleteRoom,
  getActiveRooms,
} = require("./rooms.controller");
const router = require("express").Router();

router.post("/add", addRoom);
router.get("/:id", getRoomById);
router.get("/", getRooms);
router.put("/update", updateRoom);
// router.delete("/delete", deleteRoom);
router.get("/all/active", getActiveRooms);
router.post("/get", getRoomByCode);

module.exports = router;
