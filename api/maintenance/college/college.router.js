const {
  getColleges,
  getCollegeById,
  addCollege,
  updateCollege,
  deleteCollege,
} = require("./college.controller");
const router = require("express").Router();

router.post("/add", addCollege);
router.get("/:id", getCollegeById);
router.get("/", getColleges);
router.put("/update", updateCollege);
router.delete("/delete", deleteCollege);

module.exports = router;
