const {
  getSchoolYearById,
  getSchoolYearByName,
  getActiveSchoolYears,
  getInUseSchoolYear,
  getCurrentSchoolYear,
  getSchoolYears,
  addSchoolYear,
  updateSchoolYear,
  deleteSchoolYear,
} = require("./schoolyear.controller");
const router = require("express").Router();

router.post("/add", addSchoolYear);
router.get("/current", getCurrentSchoolYear);
router.get("/:id", getSchoolYearById);
router.get("/all/active", getActiveSchoolYears);
router.get("/", getSchoolYears);
router.put("/update", updateSchoolYear);
router.delete("/delete", deleteSchoolYear);
router.post("/get", getSchoolYearByName);
router.get("/inuse/active", getInUseSchoolYear);
module.exports = router;
