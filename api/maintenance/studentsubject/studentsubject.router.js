const {
  getStudentsByPeriod,
  getSubjectsByPeriod,
  getIncludedSubjectsByStudent,
  getAllSubjectsByStudent,
  getIncludedSubjectsByStudentById,
  showReason,
  addStudentSubject,
  addStudentSubjects,
  updateStudentSubject,
  deactivateStudentSubject,
  restoreStudentSubject,
  getActiveScheduleAssignments,
  reassignScheduleTeacher,
  setScheduleDissolved,
} = require("./studentsubject.controller");
const router = require("express").Router();

router.get(
  "/period/students/school_year_id=:school_year_id&semester_id=:semester_id",
  getStudentsByPeriod,
);
router.get("/schedule-assignments", getActiveScheduleAssignments);
router.get(
  "/period/school_year_id=:school_year_id&semester_id=:semester_id",
  getSubjectsByPeriod,
);
router.get(
  "/included/student_id=:student_id&school_year_id=:school_year_id&semester_id=:semester_id",
  getIncludedSubjectsByStudent,
);
router.get(
  "/overall/student_id=:student_id&school_year_id=:school_year_id&semester_id=:semester_id",
  getAllSubjectsByStudent,
);
router.get("/:id", getIncludedSubjectsByStudentById);
router.get("/excluded/:id", showReason);
router.post("/add", addStudentSubject);
router.post("/add-many", addStudentSubjects);
router.put("/update", updateStudentSubject);
router.put("/deactivate", deactivateStudentSubject);
router.put("/restore", restoreStudentSubject);
router.put("/schedule-assignments/reassign", reassignScheduleTeacher);
router.put("/schedule-assignments/dissolve", setScheduleDissolved);

module.exports = router;
