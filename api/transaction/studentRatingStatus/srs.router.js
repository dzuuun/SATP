const {
  getTransactions,
  getRatingsByTransactionId,
  getCommentByTransactionId,
  addTransaction,
} = require("./srs.controller");
const router = require("express").Router();

router.get(
  "/all/school_year_id=:school_year_id&semester_id=:semester_id",
  getTransactions
);
router.get("/:id", getRatingsByTransactionId);
router.get("/comment/:id", getCommentByTransactionId);
router.post("/add", addTransaction);

module.exports = router;
