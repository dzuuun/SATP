const {
  getIndividualRating,
  getDepartmentalRating,
  getCollegiateRating,
  getComment,
  getDepartmentalComment,
  getCollegiateComment,
  getTeacherSubject,
  getTeacherInformation,
  getBulkIndividualRating,
  getTeachersByPeriod,
} = require("./rating.controller");
const router = require("express").Router();

router.post("/individual", getIndividualRating);
router.post("/departmental", getDepartmentalRating);
router.post("/collegiate", getCollegiateRating);
router.post("/comment", getComment);
router.post("/comment/departmental", getDepartmentalComment);
router.post("/comment/collegiate", getCollegiateComment);
router.post("/teacher/subjects", getTeacherSubject);
router.post("/teacher/information", getTeacherInformation);
router.post("/teacher/period", getTeachersByPeriod);
router.post("/individual/bulk-export", getBulkIndividualRating);

module.exports = router;
