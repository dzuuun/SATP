const {
  getColleges,
  getActiveColleges,
  getCollegeById,
  getCollegeByCode,
  addCollege,
  updateCollege,
  deleteCollege,
} = require("./college.controller");
const router = require("express").Router();

router.post("/add", addCollege);
router.get("/:id", getCollegeById);
router.get("/all/active", getActiveColleges);
router.get("/", getColleges);
router.put("/update", updateCollege);
router.delete("/delete", deleteCollege);
router.post("/get", getCollegeByCode);

module.exports = router;
