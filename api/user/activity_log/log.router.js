const router = require("express").Router();
const { getLog, getYears } = require("./log.controller");

router.get("/years", getYears);
router.post("/", getLog);

module.exports = router;
