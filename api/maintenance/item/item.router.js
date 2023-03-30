const {
  getAllItem,
  getItemById,
  addItem,
  updateItem,
  deleteItem,
  searchItem,
} = require("./item.controller");
const router = require("express").Router();

router.post("/add", addItem);
router.get("/:id", getItemById);
router.get("/", getAllItem);
router.put("/update", updateItem);
router.get("/search/any", searchItem);
router.delete("/delete", deleteItem);

module.exports = router;
