const {
  getOverallRanking,
  getCollegiateRanking,
  getDepartmentalRanking,
} = require("./ranking.controller");
const router = require("express").Router();

router.post("/overall", getOverallRanking);
// router.get("/collegiate/school_year_id=:school_year_id&semester_id=:semester_id&is_part_time=:is_part_time&colleges_id=:colleges_id", getCollegiateRanking);
router.post("/collegiate", getCollegiateRanking);
router.post("/departmental", getDepartmentalRanking);

module.exports = router;
