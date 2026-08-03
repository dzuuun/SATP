const {
  getIndividualRating,
  getDepartmentalRating,
  getCollegiateRating,
  getComment,
  getDepartmentalComment,
  getCollegiateComment,
  getTeacherSubject,
  getTeacherInformation,
  getBulkIndividualRating,
  getTeachersByPeriod,
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

  getBulkIndividualRating: (req, res) => {
    const { school_year_id, semester_id, teacher_id } = req.body || {};
    if (!school_year_id || !semester_id) {
      return res.status(400).json({
        success: 0,
        message: "School year and semester are required.",
      });
    }

    getBulkIndividualRating(
      { school_year_id, semester_id, teacher_id: teacher_id || null },
      (error, results) => {
        if (error) {
          console.error("Bulk individual rating export failed:", error);
          return res.status(500).json({
            success: 0,
            message: "Unable to prepare the individual rating export.",
          });
        }
        return res.json({
          success: 1,
          message: "Individual rating export data retrieved successfully.",
          count: results.ratings.length,
          data: results,
        });
      },
    );
  },

  getTeachersByPeriod: (req, res) => {
    const { school_year_id, semester_id } = req.body || {};
    if (!school_year_id || !semester_id) {
      return res.status(400).json({
        success: 0,
        message: "School year and semester are required.",
      });
    }
    getTeachersByPeriod(
      { school_year_id, semester_id },
      (error, results) => {
        if (error) {
          console.error("Period teacher lookup failed:", error);
          return res.status(500).json({
            success: 0,
            message: "Unable to load teachers for the selected period.",
          });
        }
        return res.json({
          success: 1,
          message: "Period teachers retrieved successfully.",
          count: results.length,
          data: results,
        });
      },
    );
  },
};
