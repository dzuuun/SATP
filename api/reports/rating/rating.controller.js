const {
  getIndividualRating,
  getDepartmentalRating,
  getCollegiateRating,
  getComment,
  getDepartmentalComment,
  getCollegiateComment,
  getTeacherSubject,
  getTeacherInformation,
} = require("./rating.model");

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
        message: "Overall rating retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },
  getDepartmentalRating: (req, res) => {
    const body = req.body;
    getDepartmentalRating(body, (err, results) => {
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
        message: "Overall rating retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },
  getCollegiateRating: (req, res) => {
    const body = req.body;
    getCollegiateRating(body, (err, results) => {
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
        message: "Overall rating retrieved successfully.",
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

  getDepartmentalComment: (req, res) => {
    const body = req.body;
    getDepartmentalComment(body, (err, results) => {
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

  getCollegiateComment: (req, res) => {
    const body = req.body;
    getCollegiateComment(body, (err, results) => {
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
};
