const {
  getAllStudent,
  getStudentById,
  addStudent,
  updateStudentInfo,
  updateStudentUsername,
  deleteStudent,
  searchStudents,
} = require("./student.controller");
const router = require("express").Router();

router.post("/add", addStudent);
router.get("/:id", getStudentById);
router.get("/", getAllStudent);
router.put("/update/info", updateStudentInfo);
router.put("/update/username", updateStudentUsername);
router.get("/search/any", searchStudents);
router.delete("/delete", deleteStudent);


module.exports = router;
