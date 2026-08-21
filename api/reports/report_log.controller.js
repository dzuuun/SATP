const { createReportLog, getReportContext } = require("./report_log.model");

const REPORT_LABELS = Object.freeze({
  "rating:individual": "individual rating",
  "rating:institutional": "institutional rating",
  "rating:collegiate": "college rating",
  "rating:departmental": "departmental rating",
  "ranking:overall": "overall ranking",
  "ranking:overallSHS": "overall SHS ranking",
  "ranking:collegiate": "college ranking",
  "ranking:departmental": "departmental ranking",
});

const TEACHING_STATUS_LABELS = Object.freeze({
  0: "Full Time",
  1: "Part Time",
  2: "NTPO & Admin",
});

function logReportGeneration(req, res) {
  const bulk = req.body?.bulk === true;
  const category = String(req.body?.category || "").trim();
  const reportType = String(req.body?.report_type || "").trim();
  const reportLabel = REPORT_LABELS[`${category}:${reportType}`];
  const schoolYearId = Number.parseInt(req.body?.school_year_id, 10);
  const semesterId = Number.parseInt(req.body?.semester_id, 10);
  const teacherId = req.body?.teacher_id
    ? Number.parseInt(req.body.teacher_id, 10)
    : null;
  const teachingStatus = String(req.body?.teaching_status ?? "").trim();

  if (
    !reportLabel ||
    !Number.isInteger(schoolYearId) ||
    !Number.isInteger(semesterId) ||
    (req.body?.teacher_id && !Number.isInteger(teacherId)) ||
    (category === "ranking" && !(teachingStatus in TEACHING_STATUS_LABELS))
  ) {
    return res.status(400).json({
      success: 0,
      message: "Valid report and academic-period details are required.",
    });
  }

  getReportContext(
    { schoolYearId, semesterId, teacherId },
    (contextError, context) => {
      if (contextError) {
        console.error("Unable to resolve report log context:", contextError);
        return res.status(500).json({
          success: 0,
          message: "The report was generated, but its activity could not be logged.",
        });
      }
      if (
        !context?.school_year ||
        !context?.semester ||
        (teacherId && !context.teacher_name)
      ) {
        return res.status(400).json({
          success: 0,
          message: "The selected report context could not be found.",
        });
      }

      const details = [
        `School year: ${context.school_year}`,
        `Semester: ${context.semester}`,
      ];
      if (category === "ranking") {
        details.push(
          `Teaching status: ${TEACHING_STATUS_LABELS[teachingStatus]}`,
        );
      }
      if (context.teacher_name) {
        details.push(`Teacher: ${context.teacher_name}`);
      } else if (bulk) {
        details.push("Teacher: All teachers");
      }

      const prefix = bulk
        ? "Generated a bulk report export"
        : `Generated ${reportLabel} report`;
      const action = `${prefix} - ${details.join("; ")}.`;

      createReportLog(req.user.id, action, (error) => {
        if (error) {
          console.error("Unable to log report generation:", error);
          return res.status(500).json({
            success: 0,
            message:
              "The report was generated, but its activity could not be logged.",
          });
        }
        return res.status(201).json({
          success: 1,
          message: "Report generation logged successfully.",
        });
      });
    },
  );
}

module.exports = { logReportGeneration };
