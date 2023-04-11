const { getTransactions, addTransaction } = require("./srs.controller");
const router = require("express").Router();

router.get("/", getTransactions);
router.post("/add", addTransaction)

module.exports = router;
