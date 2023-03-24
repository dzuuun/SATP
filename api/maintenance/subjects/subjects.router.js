const {
  addSubject,
  getSubjectById,
  getSubjects,
  updateSubject,
  searchSubjects,
  deleteSubject,
} = require("./subjects.controller");
const router = require("express").Router();

router.post("/add", addSubject);
router.get("/:id", getSubjectById);
router.get("/", getSubjects);
router.put("/update", updateSubject);
router.get("/search/any", searchSubjects);
router.delete("/delete", deleteSubject);

module.exports = router;