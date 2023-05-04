const {
  getOverallRanking,
  getCollegiateRanking,
  getDepartmentalRanking,
} = require("./ranking.controller");
const router = require("express").Router();

router.get("/overall/school_year_id=:school_year_id&semester_id=:semester_id&is_part_time=:is_part_time", getOverallRanking);
router.get("/collegiate", getCollegiateRanking);
router.get("/departmental", getDepartmentalRanking);

module.exports = router;
