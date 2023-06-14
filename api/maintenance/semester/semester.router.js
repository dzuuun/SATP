const {
  getSemesters,
  getActiveSemesters,
  getSemesterById,
  addSemester,
  updateSemester,
  deleteSemester,
} = require("./semester.controller");
const router = require("express").Router();

router.post("/add", addSemester);
router.get("/:id", getSemesterById);
router.get("/all/active", getActiveSemesters);
router.get("/", getSemesters);
router.put("/update", updateSemester);
router.delete("/delete", deleteSemester);

module.exports = router;
