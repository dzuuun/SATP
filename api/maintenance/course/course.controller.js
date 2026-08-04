const model = require("./course.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "Course",
  plural: "Courses",
  actions: {
    getCourses: ["getCourses", "list"],
    getActiveCourses: ["getActiveCourses", "active"],
    getCourseById: ["getCourseById", "one", "id"],
    getCourseByCode: ["getCourseByCode", "one", "body"],
    addCourse: ["addCourse", "create", "body"],
    updateCourse: ["updateCourse", "update", "body"],
    deleteCourse: ["deleteCourse", "delete", "body"],
  },
});
