const pool = require("../../db/db");

function createReportLog(userId, action, callBack) {
  pool.query(
    `INSERT INTO activity_log (user_id, date_time, action)
     VALUES (?, CURRENT_TIMESTAMP, ?)`,
    [userId, action],
    (error, results) => callBack(error, results),
  );
}

function getReportContext(
  { schoolYearId, semesterId, teacherId = null },
  callBack,
) {
  pool.query(
    `SELECT
       (SELECT name FROM school_years WHERE id = ? LIMIT 1) AS school_year,
       (SELECT name FROM semesters WHERE id = ? LIMIT 1) AS semester,
       (SELECT CONCAT(
          IFNULL(CONCAT(prefix, ' '), ''),
          givenname,
          ' ',
          surname,
          IF(suffix IS NOT NULL AND suffix <> '', CONCAT(', ', suffix), '')
        ) FROM teachers WHERE id = ? LIMIT 1) AS teacher_name`,
    [schoolYearId, semesterId, teacherId],
    (error, results) => callBack(error, results?.[0] || null),
  );
}

module.exports = { createReportLog, getReportContext };
