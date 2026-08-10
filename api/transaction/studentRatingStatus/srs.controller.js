const {
  getTransactions,
  getTransactionsByStudent,
  getAcademicRecordsByStudent,
  getTransactionInfoById,
  getSYSemData,
  getCommentByTransactionId,
  addTransaction,
  submitRating,
  submitCommentStatus,
  submitAssessment,
  getNotRatedTransactions,
  getRatingAccess,
  canManageRatingAccess,
  setRatingAccess,
} = require("./srs.model");

function requireOpenRating(res, next) {
  getRatingAccess((error, access) => {
    if (error) {
      console.error("Unable to check student rating access:", error);
      return res.status(500).json({
        success: 0,
        message: "Unable to verify whether student rating is available.",
      });
    }
    if (!access.enabled) {
      return res.status(403).json({
        success: 0,
        message: "Student rating is currently closed.",
      });
    }
    next();
  });
}

module.exports = {
  getRatingAccess: (req, res) => {
    getRatingAccess((error, access) => {
      if (error) {
        console.error("Unable to load student rating access:", error);
        return res.status(500).json({
          success: 0,
          message: "Unable to load student rating access.",
        });
      }
      canManageRatingAccess(req.user.id, (permissionError, canManage) => {
        if (permissionError) {
          console.error(
            "Unable to verify rating access permission:",
            permissionError,
          );
          return res.status(500).json({
            success: 0,
            message: "Unable to verify rating access permission.",
          });
        }
        return res.json({
          success: 1,
          data: { ...access, can_manage: canManage },
        });
      });
    });
  },

  setRatingAccess: (req, res) => {
    const enabled = req.body?.enabled;
    const userId = req.user.id;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: 0,
        message: "A valid rating status and user are required.",
      });
    }
    setRatingAccess({ enabled, user_id: userId }, (error, access) => {
      if (error) {
        console.error("Unable to update student rating access:", error);
        return res.status(error.statusCode || 500).json({
          success: 0,
          message: error.message || "Unable to update student rating access.",
        });
      }
      return res.json({
        success: 1,
        message: enabled
          ? "Student rating is now open."
          : "Student rating is now closed.",
        data: access,
      });
    });
  },

  getTransactions: (req, res) => {
    const body = req.params;
    getTransactions(body, (err, results) => {
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
        message: "Items information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getTransactionsByStudent: (req, res) => {
    const body = req.params;
    getTransactionsByStudent(body, (err, results) => {
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
        message: "Student's Subjects retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getAcademicRecordsByStudent: (req, res) => {
    const params =
      Number(req.user.transaction_access) === 1
        ? req.params
        : { ...req.params, student_id: req.user.id };
    getAcademicRecordsByStudent(params, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          success: 0,
          message: "Unable to retrieve the student's academic records.",
        });
      }
      return res.json({
        success: 1,
        message: "Student academic records retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getSYSemData: (req, res) => {
    const body = req.params;
    getSYSemData(body, (err, results) => {
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
        message: "Information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getTransactionInfoById: (req, res) => {
    const id = req.params.id;
    getTransactionInfoById(id, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results?.length) {
        return res.status(404).json({
          success: 0,
          message: "No record found.",
        });
      }
      if (
        Number(req.user.transaction_access) !== 1 &&
        Number(results[0].student_id) !== Number(req.user.id)
      ) {
        return res.status(403).json({
          success: 0,
          message: "You do not have access to this academic record.",
        });
      }
      return res.json({
        success: 1,
        message: "Item retrieved successfully.",
        data: results,
      });
    });
  },

  getCommentByTransactionId: (req, res) => {
    const id = req.params.id;
    getCommentByTransactionId(id, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results?.length) {
        return res.status(404).json({
          success: 0,
          message: "No record found.",
        });
      }
      if (
        Number(req.user.transaction_access) !== 1 &&
        Number(results[0].student_id) !== Number(req.user.id)
      ) {
        return res.status(403).json({
          success: 0,
          message: "You do not have access to this comment.",
        });
      }
      return res.json({
        success: 1,
        message: "Item retrieved successfully.",
        data: results,
      });
    });
  },
  addTransaction: (req, res) => {
    const body = { ...req.body, user_id: req.user.id };
    const requiredIds = [
      body.school_year_id,
      body.semester_id,
      body.subject_id,
      body.teacher_id,
      body.id,
    ];
    if (requiredIds.some((value) => !Number.isInteger(Number(value)) || Number(value) < 1)) {
      return res.status(400).json({
        success: 0,
        message: "A valid student, period, subject, and teacher are required.",
      });
    }

    addTransaction(body, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: 0,
          message: "Database error occurred.",
        });
      }

      if (!results) {
        return res.status(400).json({
          success: 0,
          message: "Invalid or missing data.",
        });
      }

      return res.json({
        success: 1,
        message: results.skipped
          ? "Transaction already exists; no changes were required."
          : results.updated
            ? "Transaction updated successfully."
            : "Transaction added successfully.",
        data: results,
      });
    });
  },

  submitRating: (req, res) => {
    const body = req.body;
    requireOpenRating(res, () => {
      submitRating(body, (err, results) => {
        if (err) {
          console.log(err);
          return res.json({
            success: 0,
            message: "Transaction already exists. Try again.",
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
          message: "Rating added successfully.",
          data: results,
        });
      });
    });
  },

  submitCommentStatus: (req, res) => {
    const body = { ...req.body, user_id: req.user.id };
    requireOpenRating(res, () => {
      submitCommentStatus(body, (err, results) => {
        if (err) {
          console.log(err);
          return res.json({
            success: 0,
            message: "Transaction already exists. Try again.",
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
          message:
            "Subject rated successfully. Thank you for your participation.",
          data: results,
        });
      });
    });
  },

  submitAssessment: (req, res) => {
    const body = { ...req.body, user_id: req.user.id };
    if (
      !body.academic_record_id ||
      !body.user_id ||
      !Array.isArray(body.ratings)
    ) {
      return res.status(400).json({
        success: 0,
        message: "Invalid assessment submission.",
      });
    }
    requireOpenRating(res, () => {
      submitAssessment(body, (err, results) => {
        if (err) {
          console.error(err);
          return res.status(400).json({
            success: 0,
            message: err.message || "Unable to submit the assessment.",
          });
        }
        return res.json({
          success: 1,
          message: "Assessment submitted successfully.",
          data: results,
        });
      });
    });
  },

  getNotRatedTransactions: (req, res) => {
    const body = req.body;
    getNotRatedTransactions(body, (err, results) => {
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
        message: "Items information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },
};
