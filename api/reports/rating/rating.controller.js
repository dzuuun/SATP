const { getIndividualRating, getComment, getTeacherSubject, getTeacherInformation} = require("./rating.model");

module.exports = {
  getIndividualRating: (req, res) => {
    const body = req.body;
    getIndividualRating(body, (err, results) => {
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
        message: "Overall ranking retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },
  getComment: (req, res) => {
    const body = req.body;
    getComment(body, (err, results) => {
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
        message: "Comments retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getTeacherSubject: (req, res) => {
    const body = req.body;
    getTeacherSubject(body, (err, results) => {
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
        message: "Teacher's Subject retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getTeacherInformation: (req, res) => {
    const body = req.body;
    getTeacherInformation(body, (err, results) => {
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
        message: "Teacher's Subject retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

}