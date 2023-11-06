const {
  addSubject,
  getActiveSubjects,
  getSubjectById,
  getSubjectByCode,
  getSubjects,
  updateSubject,
  deleteSubject,
} = require("./subjects.controller");
const router = require("express").Router();

router.post("/add", addSubject);
router.get("/:id", getSubjectById);
router.get("/all/active", getActiveSubjects);
router.get("/", getSubjects);
router.put("/update", updateSubject);
router.delete("/delete", deleteSubject);
router.post("/get", getSubjectByCode);
module.exports = router;
