const {
  getSchools,
  getActiveSchools,
  getSchoolById,
  addSchool,
  updateSchool,
} = require("./school.controller");
const router = require("express").Router();

router.post("/add", addSchool);
router.get("/all/active", getActiveSchools);
router.get("/:id", getSchoolById);
router.get("/", getSchools);
router.put("/update", updateSchool);

module.exports = router;
