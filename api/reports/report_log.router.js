const router = require("express").Router();
const { logReportGeneration } = require("./report_log.controller");

router.post("/", logReportGeneration);

module.exports = router;
