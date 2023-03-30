const {
  getAllCategory,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  SearchCategory,
} = require("./category.controller");
const router = require("express").Router();

router.post("/add", addCategory);
router.get("/:id", getCategoryById);
router.get("/", getAllCategory);
router.put("/update", updateCategory);
router.get("/search/any", SearchCategory);
router.delete("/delete", deleteCategory);

module.exports = router;
