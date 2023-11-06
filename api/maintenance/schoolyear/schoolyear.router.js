const {
  getSchoolYearById,
  getSchoolYearByName,
  getActiveSchoolYears,
  getSchoolYears,
  addSchoolYear,
  updateSchoolYear,
  deleteSchoolYear,
} = require("./schoolyear.controller");
const router = require("express").Router();

router.post("/add", addSchoolYear);
router.get("/:id", getSchoolYearById);
router.get("/all/active", getActiveSchoolYears);
router.get("/", getSchoolYears);
router.put("/update", updateSchoolYear);
router.delete("/delete", deleteSchoolYear);
router.post("/get", getSchoolYearByName);
module.exports = router;
