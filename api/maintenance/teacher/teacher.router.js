const {
  getTeachers,
  getActiveTeachers,
  getTeacherById,
  addTeacher,
  updateTeacher,
  deleteTeacher,
} = require("./teacher.controller");
const router = require("express").Router();

router.post("/add", addTeacher);
router.get("/", getTeachers);
router.get("/all/active", getActiveTeachers);
router.get("/:id", getTeacherById);
router.put("/update", updateTeacher);
router.delete("/delete", deleteTeacher);

module.exports = router;
