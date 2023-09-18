const {
  getTransactions,
  getTransactionsByStudent,
  getTransactionInfoById,
  getCommentByTransactionId,
  addTransaction,
  submitRating,
  submitCommentStatus,
  getNotRatedTransactions,
} = require("./srs.controller");
const router = require("express").Router();

router.get(
  "/all/school_year_id=:school_year_id&semester_id=:semester_id",
  getTransactions
);
router.get(
  "/student/subjects/school_year_id=:school_year_id&semester_id=:semester_id&student_id=:student_id",
  getTransactionsByStudent
);
router.get("/:id", getTransactionInfoById);
router.get("/comment/:id", getCommentByTransactionId);
router.post("/add", addTransaction);
router.post("/add/rating", submitRating);
router.put("/submit/:id", submitCommentStatus);
router.post("/transactions/notrated", getNotRatedTransactions);
module.exports = router;
