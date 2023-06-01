const {
  getAllItems,
  getActiveItems,
  getItemById,
  addItem,
  updateItem,
  deleteItem,
} = require("./item.controller");
const router = require("express").Router();

router.post("/add", addItem);
router.get("/:id", getItemById);
router.get("/", getAllItems);
router.get("/active/rate", getActiveItems);
router.put("/update", updateItem);
router.delete("/delete", deleteItem);

module.exports = router;
