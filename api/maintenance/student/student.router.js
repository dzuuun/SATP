const {
  getAllStudent,
  getAllActiveStudent,
  getStudentById,
  getStudentByUserName,
  addStudent,
  updateStudentInfo,
  updateStudentActiveStatus,
  deleteStudent,
} = require("./student.controller");
const router = require("express").Router();

router.post("/add", addStudent);
router.get("/:id", getStudentById);
router.get("/all/active", getAllActiveStudent);
router.get("/", getAllStudent);
router.put("/update/info", updateStudentInfo);
router.put("/update/status", updateStudentActiveStatus);
router.delete("/delete", deleteStudent);
router.post("/get", getStudentByUserName);

module.exports = router;
