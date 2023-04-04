const {
  getIncludedSubjectsByStudent,
  getExcludedSubjectsByStudent,
  getExcludedSubjects,
  addStudentSubject,
  updateStudentSubject,
  //   deleteStudentSubject,
  searchStudentSubject,
} = require("./studentsubject.controller");
const router = require("express").Router();

router.get("/", getIncludedSubjectsByStudent);
router.get("/excluded", getExcludedSubjectsByStudent);
router.get("/removed", getExcludedSubjects);
router.post("/add", addStudentSubject);
router.put("/update", updateStudentSubject);
// router.put("/delete", deleteStudentSubject);
router.get("/search/any", searchStudentSubject);

module.exports = router;
