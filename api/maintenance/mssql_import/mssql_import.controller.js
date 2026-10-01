const importer = require("./mssql_import.service");

function validPeriod(body) {
  return (
    Number.isInteger(Number(body.school_year_id)) &&
    Number(body.school_year_id) > 0 &&
    Number.isInteger(Number(body.semester_id)) &&
    Number(body.semester_id) > 0
  );
}

function validateRequest(req, res, next) {
  const importStudents = req.body.import_students !== false;
  const importSubjects = req.body.import_student_subjects === true;
  if (!importStudents && !importSubjects) {
    return res
      .status(400)
      .json({ success: 0, message: "Choose at least one MSSQL import." });
  }
  if (importSubjects && !validPeriod(req.body)) {
    return res
      .status(400)
      .json({
        success: 0,
        message:
          "A school year and semester are required when importing student courses.",
      });
  }
  req.mssqlImport = { ...req.body, importStudents, importSubjects };
  return next();
}

exports.preview = [
  validateRequest,
  async (req, res) => {
    try {
      const result = await importer.plan(req.mssqlImport);
      res.json({
        success: 1,
        message: "MSSQL import preview is ready.",
        data: result,
      });
    } catch (error) {
      console.error("Unable to preview MSSQL import:", error);
      res
        .status(400)
        .json({
          success: 0,
          message: error.message || "Unable to read the MSSQL views.",
        });
    }
  },
];

exports.run = [
  validateRequest,
  async (req, res) => {
    try {
      const result = await importer.run({
        ...req.mssqlImport,
        user_id: req.user.id,
      });
      res.json({
        success: 1,
        message: "MSSQL import completed.",
        data: result,
      });
    } catch (error) {
      console.error("Unable to run MSSQL import:", error);
      res
        .status(400)
        .json({
          success: 0,
          message: error.message || "Unable to run the MSSQL import.",
        });
    }
  },
];

exports.studentCourses = async (_req, res) => {
  try {
    const rows = await importer.studentCourses();
    res.json({
      success: 1,
      message: "MSSQL student-course rows retrieved successfully.",
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Unable to read MSSQL student-course view:", error);
    res.status(400).json({
      success: 0,
      message: error.message || "Unable to read the MSSQL student-course view.",
    });
  }
};
