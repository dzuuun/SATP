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
  getActiveScheduleAssignments: (req, res) => {
    if (!hasValidIds(req.query, ["school_year_id", "semester_id"])) {
      return res.status(400).json({
        success: 0,
        message: "A valid school year and semester are required.",
      });
    }
    return model.getActiveScheduleAssignments(
      { ...req.query, requesting_user_id: req.user.id },
      listResponse(
        res,
        "Schedule assignments retrieved successfully.",
        "Unable to retrieve schedule assignments.",
      ),
    );
  },

  reassignScheduleTeacher: (req, res) => {
    const data = { ...req.body, user_id: req.user.id };
    const fields = [
      "school_year_id",
      "semester_id",
      "subject_id",
      "current_teacher_id",
      "teacher_id",
      "teaching_school_id",
    ];
    if (
      !hasValidIds(data, fields) ||
      !String(data.schedule_code || "").trim()
    ) {
      return res.status(400).json({
        success: 0,
        message: "A valid section and teacher are required.",
      });
    }
    return model.reassignScheduleTeacher(data, (error, results) => {
      if (error) {
        return res.status(400).json({ success: 0, message: error.message });
      }
      return res.json({
        success: 1,
        message: "Teacher reassigned successfully.",
        data: results,
      });
    });
  },

  setScheduleDissolved: (req, res) => {
    const data = { ...req.body, user_id: req.user.id };
    if (
      !hasValidIds(data, ["school_year_id", "semester_id", "subject_id"]) ||
      !String(data.schedule_code || "").trim() ||
      typeof data.dissolved !== "boolean"
    ) {
      return res.status(400).json({
        success: 0,
        message: "A valid schedule and dissolved status are required.",
      });
    }
    return model.setScheduleDissolved(data, (error, results) => {
      if (error) {
        return res.status(400).json({ success: 0, message: error.message });
      }
      return res.json({
        success: 1,
        message: data.dissolved
          ? "Schedule dissolved successfully."
          : "Schedule restored successfully.",
        data: results,
      });
    });
  },

  getStudentsByPeriod: (req, res) => {
    if (!hasValidIds(req.params, ["school_year_id", "semester_id"])) {
      return res.status(400).json({
        success: 0,
        message: "A valid school year and semester are required.",
      });
    }
    return model.getStudentsByPeriod(
      { ...req.params, requesting_user_id: req.user.id },
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
      { ...req.params, requesting_user_id: req.user.id },
      listResponse(
        res,
        "Student courses retrieved successfully.",
        "Unable to retrieve student courses.",
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
      { ...req.params, requesting_user_id: req.user.id },
      listResponse(
        res,
        "Student courses retrieved successfully.",
        "Unable to retrieve student courses.",
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
      { id: req.params.id, requesting_user_id: req.user.id },
      (error, results) => {
        if (error) {
          return databaseError(
            res,
            error,
            "Unable to retrieve the student course.",
          );
        }
        if (!results.length) {
          return res
            .status(404)
            .json({ success: 0, message: "Student course not found." });
        }
        return res.json({
          success: 1,
          message: "Student course retrieved successfully.",
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
      { ...req.params, requesting_user_id: req.user.id },
      listResponse(
        res,
        "Excluded student courses retrieved successfully.",
        "Unable to retrieve excluded student courses.",
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
          .json({ success: 0, message: "Student course not found." });
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
        return databaseError(res, error, "Unable to add the student course.");
      }
      return res.status(201).json({
        success: 1,
        message: "Student course added successfully.",
        id: results.insertId,
      });
    });
  },

  addStudentSubjects: (req, res) => {
    const { subjects } = req.body;
    if (
      !hasValidIds(req.body, [
        "student_id",
        "school_id",
        "school_year_id",
        "semester_id",
      ]) ||
      !Array.isArray(subjects) ||
      subjects.length === 0 ||
      subjects.length > 100 ||
      subjects.some(
        (subject) =>
          !hasValidIds(subject, [
            "subject_id",
            "teacher_id",
            "teaching_department_id",
          ]),
      )
    ) {
      return res.status(400).json({
        success: 0,
        message:
          "Provide a school, student, period, and between 1 and 100 valid courses with teaching departments.",
      });
    }

    const enrollmentKeys = new Set(
      subjects.map((subject) => [
        Number(subject.subject_id),
        String(subject.schedule_code || "").trim().toLowerCase(),
        Number(subject.teacher_id),
      ].join("|")),
    );
    if (enrollmentKeys.size !== subjects.length) {
      return res.status(400).json({
        success: 0,
        message: "The submitted course, schedule, and teacher list contains duplicates.",
      });
    }

    return model.addStudentSubjects(
      { ...req.body, user_id: req.user.id },
      (error, results) => {
        if (error) {
          console.error("Unable to add the student courses.", error);
          return res.status(400).json({ success: 0, message: error.message });
        }
        return res.status(results.created.length ? 201 : 200).json({
          success: 1,
          message: `${results.created.length} subject${
            results.created.length === 1 ? "" : "s"
          } added; ${results.updated.length} updated; ${results.skipped.length} unchanged.`,
          count: results.created.length,
          data: results,
        });
      },
    );
  },

  updateStudentSubject: (req, res) => {
    const data = { ...req.body, user_id: req.user.id };
    if (
      !hasValidIds(data, [
        "id",
        "student_id",
        "school_year_id",
        "semester_id",
        "subject_id",
        "teacher_id",
      ]) ||
      (data.room_id && !isPositiveId(data.room_id))
    ) {
      return res.status(400).json({
        success: 0,
        message: "A valid student course record is required.",
      });
    }
    return model.updateStudentSubject(data, (error, results) => {
      if (error?.code === "DUPLICATE_SUBJECT") {
        return res.status(409).json({ success: 0, message: error.message });
      }
      if (error) {
        return databaseError(res, error, "Unable to update the student course.");
      }
      if (!results.affectedRows) {
        return res.status(404).json({
          success: 0,
          message: "Student course not found.",
        });
      }
      return res.json({
        success: 1,
        message: results.changedRows
          ? "Student course updated successfully."
          : "Student course information is unchanged.",
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
    const data = { ...req.body, user_id: req.user.id };
    return model.deactivateStudentSubject(data, (error, results) => {
      if (error) {
        return databaseError(
          res,
          error,
          "Unable to exclude the student course.",
        );
      }
      if (!results.changedRows) {
        return res.status(404).json({
          success: 0,
          message: "Student course not found or already excluded.",
        });
      }
      return res.json({
        success: 1,
        message: results.record
          ? `Excluded student course for ${results.record.student_number}: ${results.record.subject_code} | ${results.record.schedule_code || "No schedule code"} | ${results.record.teacher_name}`
          : "Student course excluded successfully.",
      });
    });
  },

  restoreStudentSubject: (req, res) => {
    const data = { ...req.body, user_id: req.user.id };
    if (!isPositiveId(data.id)) {
      return res.status(400).json({
        success: 0,
        message: "A valid student course record is required.",
      });
    }
    return model.restoreStudentSubject(data, (error, results) => {
      if (error) {
        return databaseError(res, error, "Unable to restore the student course.");
      }
      if (!results.changedRows) {
        return res.status(404).json({
          success: 0,
          message: "Student course not found or already included.",
        });
      }
      return res.json({
        success: 1,
        message: results.record
          ? `Restored student course for ${results.record.student_number}: ${results.record.subject_code} | ${results.record.schedule_code || "No schedule code"} | ${results.record.teacher_name}`
          : "Student course restored successfully.",
      });
    });
  },
};
