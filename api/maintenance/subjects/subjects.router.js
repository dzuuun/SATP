const {
  addSubject,
  getSubjectById,
  getSubjects,
  updateSubject,
  // deleteSubject
} = require("./subjects.controller");
const router = require("express").Router();

router.post("/add", addSubject);
router.get("/:id", getSubjectById);
router.get("/", getSubjects);
router.put("/update", updateSubject);
// router.delete("/delete", deleteSubject);

module.exports = router;
