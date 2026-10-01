const {
  getTeachers,
  getActiveTeachers,
  getTeacherById,
  getTeacherByName,
  addTeacher,
  updateTeacher,
  activateTeacher,
  mergeTeacher,
  deleteTeacher,
} = require("./teacher.controller");
const router = require("express").Router();
const teacherRoster = require("./teacher_roster.controller");
const {
  requireSuperAdmin,
  requireSameOrigin,
} = require("../../../auth/auth_validation");

router.post("/roster/preview", requireSuperAdmin, teacherRoster.preview);
router.post(
  "/roster/run",
  requireSuperAdmin,
  requireSameOrigin,
  teacherRoster.run,
);
router.post("/add", addTeacher);
router.get("/", getTeachers);
router.get("/all/active", getActiveTeachers);
router.get("/:id", getTeacherById);
router.put("/update", updateTeacher);
router.put("/activate", activateTeacher);
router.put("/merge", mergeTeacher);
router.delete("/delete", deleteTeacher);
router.post("/get", getTeacherByName);

module.exports = router;
