const {
  getAllCategory,
  getAllActiveCategory,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
} = require("./category.controller");
const router = require("express").Router();

router.post("/add", addCategory);
router.get("/:id", getCategoryById);
router.get("/all/active", getAllActiveCategory);
router.get("/", getAllCategory);
router.put("/update", updateCategory);
router.delete("/delete", deleteCategory);

module.exports = router;
