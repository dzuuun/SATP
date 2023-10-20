const {
  getCourses,
  getActiveCourses,
  getCourseById,
  getCourseByCode,
  addCourse,
  updateCourse,
  deleteCourse,
} = require("./course.controller");
const router = require("express").Router();

router.post("/add", addCourse);
router.get("/:id", getCourseById);
router.get("/all/active", getActiveCourses);
router.get("/", getCourses);
router.put("/update", updateCourse);
router.delete("/delete", deleteCourse);
router.post("/get", getCourseByCode);
module.exports = router;
