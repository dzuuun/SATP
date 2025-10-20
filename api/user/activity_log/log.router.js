const router = require("express").Router();
const { getLog } = require("./log.controller");

// DataTables server-side endpoint
router.post("/", getLog);

module.exports = router;
