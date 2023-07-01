const {
  getIncludedSubjectsByStudent,
  getAllSubjectsByStudent,
  getIncludedSubjectsByStudentById,
  showReason,
  // getExcludedSubjects,
  addStudentSubject,
  // updateStudentSubject,
  deactivateStudentSubject,
} = require("./studentsubject.controller");
const router = require("express").Router();

router.get(
  "/included/student_id=:student_id&school_year_id=:school_year_id&semester_id=:semester_id",
  getIncludedSubjectsByStudent
);
router.get(
  "/overall/student_id=:student_id&school_year_id=:school_year_id&semester_id=:semester_id",
  getAllSubjectsByStudent
);
router.get("/:id", getIncludedSubjectsByStudentById)
router.get("/excluded/:id", showReason);
// router.get("/removed", getExcludedSubjects);
router.post("/add", addStudentSubject);
// router.put("/update", updateStudentSubject);
router.put("/deactivate", deactivateStudentSubject);

module.exports = router;
