const {
  getAllStudent,
  getStudentById,
  addStudent,
  updateStudentInfo,
  updateStudentActiveStatus,
  deleteStudent,
} = require("./student.controller");
const router = require("express").Router();

router.post("/add", addStudent);
router.get("/:id", getStudentById);
router.get("/", getAllStudent);
router.put("/update/info", updateStudentInfo);
router.put("/update/status", updateStudentActiveStatus);
router.delete("/delete", deleteStudent);


module.exports = router;
