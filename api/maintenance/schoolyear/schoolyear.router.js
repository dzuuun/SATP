const {
  getSchoolYearById,
  getSchoolYears,
  addSchoolYear,
  updateSchoolYear,
  deleteSchoolYear,
  searchSchoolYears,
} = require("./schoolyear.controller");
const router = require("express").Router();

router.post("/add", addSchoolYear);
router.get("/:id", getSchoolYearById);
router.get("/", getSchoolYears);
router.put("/update", updateSchoolYear);
router.delete("/delete", deleteSchoolYear);
router.get("/search/any", searchSchoolYears);

module.exports = router;
