const {
  getCourses,
  getActiveCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
} = require("./course.model");

module.exports = {
  getCourses: (req, res) => {
    getCourses((err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Courses information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getActiveCourses: (req, res) => {
    getActiveCourses((err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Courses information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getCourseById: (req, res) => {
    const id = req.params.id;
    getCourseById(id, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Course information retrieved successfully.",
        data: results,
      });
    });
  },

  addCourse: (req, res) => {
    const body = req.body;
    addCourse(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "Course already exists. Try again.",
        });
      }
      if (results === undefined) {
        return res.status(500).json({
          success: 0,
          message: "Some fields are missing or incorrect format.",
        });
      }
      return res.json({
        success: 1,
        message: "Course added successfully.",
        data: results,
      });
    });
  },

  updateCourse: (req, res) => {
    const body = req.body;
    updateCourse(body, (err, results) => {
      if (err) {
        console.log(err);
        return false;
      }
      if (results.changedRows == 0) {
        return res.json({
          success: 0,
          message: "Contents are still the same.",
        });
      }
      return res.json({
        success: 1,
        message: "Course information updated successfully.",
      });
    });
  },

  deleteCourse: (req, res) => {
    const body = req.body;
    deleteCourse(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.affectedRows == 0) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Course deleted successfully.",
      });
    });
  },
};
