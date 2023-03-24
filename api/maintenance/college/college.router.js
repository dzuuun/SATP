const {
  getColleges,
  getCollegeById,
  addCollege,
  updateCollege,
  deleteCollege,
  searchColleges,
} = require("./college.controller");
const router = require("express").Router();

router.post("/add", addCollege);
router.get("/:id", getCollegeById);
router.get("/", getColleges);
router.put("/update", updateCollege);
router.get("/search/any", searchColleges);
router.delete("/delete", deleteCollege);

module.exports = router;
