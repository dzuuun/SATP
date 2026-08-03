const {
  getTransactions,
  getTransactionsByStudent,
  getAcademicRecordsByStudent,
  getSYSemData,
  getTransactionInfoById,
  getCommentByTransactionId,
  addTransaction,
  submitRating,
  submitCommentStatus,
  submitAssessment,
  getNotRatedTransactions,
  getRatingAccess,
  setRatingAccess,
} = require("./srs.controller");
const router = require("express").Router();
const { requirePermission } = require("../../../auth/auth_validation");
const requireTransactionAccess = requirePermission("transaction_access");

router.get(
  "/all/school_year_id=:school_year_id&semester_id=:semester_id",
  requireTransactionAccess,
  getTransactions,
);
router.get(
  "/student/subjects/school_year_id=:school_year_id&semester_id=:semester_id&student_id=:student_id",
  requireTransactionAccess,
  getTransactionsByStudent,
);
router.get(
  "/student/academic-records/school_year_id=:school_year_id&semester_id=:semester_id&student_id=:student_id",
  getAcademicRecordsByStudent,
);
router.get(
  "/stats/school_year_id=:school_year_id&semester_id=:semester_id",
  requireTransactionAccess,
  getSYSemData,
);
router.get("/rating-access/status", getRatingAccess);
router.put("/rating-access/status", setRatingAccess);
router.get("/:id", getTransactionInfoById);
router.get("/comment/:id", getCommentByTransactionId);
router.post("/add", requireTransactionAccess, addTransaction);
router.post("/add/rating", submitRating);
router.post("/submit-assessment", submitAssessment);
router.put("/submit/:id", submitCommentStatus);
router.post("/notrated", requireTransactionAccess, getNotRatedTransactions);
module.exports = router;
