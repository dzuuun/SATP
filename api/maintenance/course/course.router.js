const {
  getCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
} = require("./course.controller");
const router = require("express").Router();

router.post("/add", addCourse);
router.get("/:id", getCourseById);
router.get("/", getCourses);
router.put("/update", updateCourse);
router.delete("/delete", deleteCourse);

module.exports = router;
