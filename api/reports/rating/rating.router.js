const {
  getIndividualRating,
  getComment,
  getTeacherSubject,
  getTeacherInformation
} = require("./rating.controller");
const router = require("express").Router();

router.post("/individual", getIndividualRating);
router.post("/comment", getComment);
router.post("/teacher/subjects", getTeacherSubject);
router.post("/teacher/information", getTeacherInformation)

module.exports = router;
