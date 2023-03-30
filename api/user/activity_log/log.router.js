const { getLog, searchLogs } = require("./log.controller");
const router = require("express").Router();

router.get("/", getLog);
router.get("/search", searchLogs);

module.exports = router;
