const router = require("express").Router();
const { getLog, getYears, getNewEntries } = require("./log.controller");

router.get("/updates", getNewEntries);
router.get("/years", getYears);
router.post("/", getLog);

module.exports = router;
