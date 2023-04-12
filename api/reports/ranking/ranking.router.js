const {
  getOverallRanking,
  getCollegiateRanking,
  getDepartmentalRanking,
} = require("./ranking.controller");
const router = require("express").Router();

router.get("/overall", getOverallRanking);
router.get("/collegiate", getCollegiateRanking);
router.get("/departmental", getDepartmentalRanking);

module.exports = router;
