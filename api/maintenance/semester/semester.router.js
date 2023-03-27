const {
  getSemesters,
  getSemesterById,
  addSemester,
  updateSemester,
  deleteSemester,
  searchSemesters,
} = require("./semester.controller");
const router = require("express").Router();

router.post("/add", addSemester);
router.get("/:id", getSemesterById);
router.get("/", getSemesters);
router.put("/update", updateSemester);
router.get("/search/any", searchSemesters);
router.delete("/delete", deleteSemester);

module.exports = router;
