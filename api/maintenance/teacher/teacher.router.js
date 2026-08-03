const {
  getTeachers,
  getActiveTeachers,
  getTeacherById,
  getTeacherByName,
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
router.post("/get", getTeacherByName);

module.exports = router;
