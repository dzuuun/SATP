const {
getTeachers,
getTeacherById,
addTeacher,
updateTeacher,
deleteTeacher,
searchTeachers
} = require("./teacher.controller");
const router = require("express").Router();

router.post("/add", addTeacher);
router.get("/", getTeachers);
router.get("/:id", getTeacherById);
router.put("/update", updateTeacher);
router.delete("/delete", deleteTeacher);
router.get("/search/any", searchTeachers);

module.exports = router;