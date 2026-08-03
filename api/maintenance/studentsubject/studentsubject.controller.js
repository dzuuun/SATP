const model = require("./studentsubject.model");

const requiredRecordFields = [
  "student_id",
  "school_year_id",
  "semester_id",
  "subject_id",
  "teacher_id",
];

function isPositiveId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function hasValidIds(source, fields) {
  return fields.every((field) => isPositiveId(source[field]));
}

function databaseError(res, error, message) {
  console.error(message, error);
  return res.status(500).json({ success: 0, message });
}

function listResponse(res, successMessage, errorMessage) {
  return (error, results) => {
    if (error) return databaseError(res, error, errorMessage);
    return res.json({
      success: 1,
      message: successMessage,
      count: results.length,
      data: results,
    });
  };
}

module.exports = {
  getStudentsByPeriod: (req, res) => {
    if (!hasValidIds(req.params, ["school_year_id", "semester_id"])) {
      return res.status(400).json({
        success: 0,
        message: "A valid school year and semester are required.",
      });
    }
    return model.getStudentsByPeriod(
      req.params,
      listResponse(
        res,
        "Students retrieved successfully.",
        "Unable to retrieve students.",
      ),
    );
  },

  getSubjectsByPeriod: (req, res) => {
    if (!hasValidIds(req.params, ["school_year_id", "semester_id"])) {
      return res.status(400).json({
        success: 0,
        message: "A valid school year and semester are required.",
      });
    }
    return model.getSubjectsByPeriod(
      req.params,
      listResponse(
        res,
        "Student subjects retrieved successfully.",
        "Unable to retrieve student subjects.",
      ),
    );
  },

  getIncludedSubjectsByStudent: (req, res) => {
    if (
      !hasValidIds(req.params, ["student_id", "school_year_id", "semester_id"])
    ) {
      return res.status(400).json({
        success: 0,
        message: "A valid student, school year, and semester are required.",
      });
    }
    return model.getIncludedSubjectsByStudent(
      req.params,
      listResponse(
        res,
        "Student subjects retrieved successfully.",
        "Unable to retrieve student subjects.",
      ),
    );
  },

  getIncludedSubjectsByStudentById: (req, res) => {
    if (!isPositiveId(req.params.id)) {
      return res
        .status(400)
        .json({ success: 0, message: "A valid record ID is required." });
    }
    return model.getIncludedSubjectsByStudentById(
      req.params.id,
      (error, results) => {
        if (error) {
          return databaseError(
            res,
            error,
            "Unable to retrieve the student subject.",
          );
        }
        if (!results.length) {
          return res
            .status(404)
            .json({ success: 0, message: "Student subject not found." });
        }
        return res.json({
          success: 1,
          message: "Student subject retrieved successfully.",
          data: results,
        });
      },
    );
  },

  getAllSubjectsByStudent: (req, res) => {
    if (
      !hasValidIds(req.params, ["student_id", "school_year_id", "semester_id"])
    ) {
      return res.status(400).json({
        success: 0,
        message: "A valid student, school year, and semester are required.",
      });
    }
    return model.getAllSubjectsByStudent(
      req.params,
      listResponse(
        res,
        "Excluded student subjects retrieved successfully.",
        "Unable to retrieve excluded student subjects.",
      ),
    );
  },

  showReason: (req, res) => {
    if (!isPositiveId(req.params.id)) {
      return res
        .status(400)
        .json({ success: 0, message: "A valid record ID is required." });
    }
    return model.showReason(req.params, (error, results) => {
      if (error) {
        return databaseError(
          res,
          error,
          "Unable to retrieve the exclusion reason.",
        );
      }
      if (!results.length) {
        return res
          .status(404)
          .json({ success: 0, message: "Student subject not found." });
      }
      return res.json({
        success: 1,
        message: "Exclusion reason retrieved successfully.",
        data: results,
      });
    });
  },

  addStudentSubject: (req, res) => {
    if (!hasValidIds(req.body, requiredRecordFields)) {
      return res.status(400).json({
        success: 0,
        message: "Student, period, subject, and teacher are required.",
      });
    }
    return model.addStudentSubject(req.body, (error, results) => {
      if (error?.code === "DUPLICATE_SUBJECT") {
        return res.status(409).json({ success: 0, message: error.message });
      }
      if (error) {
        return databaseError(res, error, "Unable to add the student subject.");
      }
      return res.status(201).json({
        success: 1,
        message: "Student subject added successfully.",
        id: results.insertId,
      });
    });
  },

  addStudentSubjects: (req, res) => {
    const { subjects } = req.body;
    if (
      !hasValidIds(req.body, ["student_id", "school_year_id", "semester_id"]) ||
      !Array.isArray(subjects) ||
      subjects.length === 0 ||
      subjects.length > 100 ||
      subjects.some(
        (subject) => !hasValidIds(subject, ["subject_id", "teacher_id"]),
      )
    ) {
      return res.status(400).json({
        success: 0,
        message:
          "Provide a student, period, and between 1 and 100 valid subjects.",
      });
    }

    const uniqueSubjectIds = new Set(
      subjects.map((subject) => Number(subject.subject_id)),
    );
    if (uniqueSubjectIds.size !== subjects.length) {
      return res.status(400).json({
        success: 0,
        message: "The submitted subject list contains duplicates.",
      });
    }

    return model.addStudentSubjects(req.body, (error, results) => {
      if (error) {
        return databaseError(res, error, "Unable to add the student subjects.");
      }
      return res.status(results.created.length ? 201 : 409).json({
        success: results.created.length ? 1 : 0,
        message: `${results.created.length} subject${
          results.created.length === 1 ? "" : "s"
        } added; ${results.duplicates.length} already existed.`,
        count: results.created.length,
        data: results,
      });
    });
  },

  deactivateStudentSubject: (req, res) => {
    if (!isPositiveId(req.body.id) || !String(req.body.reason || "").trim()) {
      return res.status(400).json({
        success: 0,
        message: "A valid record ID and exclusion reason are required.",
      });
    }
    return model.deactivateStudentSubject(req.body, (error, results) => {
      if (error) {
        return databaseError(
          res,
          error,
          "Unable to exclude the student subject.",
        );
      }
      if (!results.changedRows) {
        return res.status(404).json({
          success: 0,
          message: "Student subject not found or already excluded.",
        });
      }
      return res.json({
        success: 1,
        message: "Student subject excluded successfully.",
      });
    });
  },
};
