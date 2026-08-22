const pool = require("../../../db/db");

const scopedTeacherDepartmentJoin = `
       INNER JOIN academic_record_departments AS report_record_department
         ON report_record_department.academic_record_id = arc.id
       INNER JOIN departments AS d
         ON d.id = report_record_department.department_id
       INNER JOIN colleges AS c
         ON d.college_id = c.id`;

const teacherCollegeAssignmentJoin = `
       INNER JOIN academic_record_departments AS report_record_department
         ON report_record_department.academic_record_id = arc.id
       INNER JOIN departments AS d
         ON d.id = report_record_department.department_id
       INNER JOIN colleges AS c
         ON c.id = d.college_id`;

module.exports = {
  getTeachersByPeriod: (data, callBack) => {
    pool.query(
      `SELECT
         t.id,
         CONCAT(IFNULL(CONCAT(t.prefix, ' '), ''), t.givenname, ' ', t.surname,
           IF(t.suffix IS NOT NULL AND t.suffix <> '', CONCAT(', ', t.suffix), '')) AS name,
         COUNT(DISTINCT arc.subject_id) AS subject_count
       FROM academic_records_consolidated AS arc
         FORCE INDEX (idx_arc_rating_period)
       INNER JOIN teachers AS t
         ON arc.teacher_id = t.id
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.is_excluded = 0
         AND arc.teacher_id IS NOT NULL
         AND arc.subject_id IS NOT NULL
       GROUP BY t.id, t.prefix, t.surname, t.givenname, t.suffix
       ORDER BY t.surname, t.givenname`,
      [data.school_year_id, data.semester_id],
      (error, results) => {
        if (error) return callBack(error);
        return callBack(null, results);
      },
    );
  },

  getBulkIndividualRating: (data, callBack) => {
    const period = [data.school_year_id, data.semester_id];
    const teacherFilter = data.teacher_id ? " AND teacher_id = ?" : "";
    const outerTeacherFilter = data.teacher_id ? " AND arc.teacher_id = ?" : "";
    const periodParameters = data.teacher_id
      ? [...period, data.teacher_id]
      : period;
    pool.query(
      `SELECT
         arc.teacher_id,
         arc.subject_id,
         rc.respondents,
         sy.name AS school_year,
         sem.name AS semester,
         CONCAT(IFNULL(CONCAT(t.prefix, ' '), ''), t.givenname, ' ', t.surname,
           IF(t.suffix IS NOT NULL AND t.suffix <> '', CONCAT(', ', t.suffix), '')) AS teacher_name,
         s.code AS subject_code,
         s.name AS subject_name,
         d.name AS department,
         c.name AS college,
         cat.id AS category_id,
         cat.name AS category,
         i.id AS item_id,
         i.number,
         i.question,
         COUNT(ti.rate) AS rating_count,
         ROUND(AVG(CAST(ti.rate AS FLOAT)), 3) AS mean
       FROM academic_records_consolidated AS arc
         FORCE INDEX (idx_arc_rating_period)
       STRAIGHT_JOIN trans_item AS ti
         FORCE INDEX (idx_trans_item_report_cover)
         ON ti.transaction_id = arc.id
       INNER JOIN (
         SELECT
           teacher_id,
           subject_id,
           COUNT(DISTINCT student_id) AS respondents
         FROM academic_records_consolidated
           FORCE INDEX (idx_arc_rating_period)
         WHERE school_year_id = ?
           AND semester_id = ?
           AND status = 1
           AND is_excluded = 0
           ${teacherFilter}
         GROUP BY teacher_id, subject_id
       ) AS rc
         ON rc.teacher_id = arc.teacher_id
        AND rc.subject_id = arc.subject_id
       INNER JOIN subjects AS s
         ON arc.subject_id = s.id
       INNER JOIN items AS i
         ON ti.item_id = i.id
       INNER JOIN categories AS cat
         ON i.category_id = cat.id
       INNER JOIN school_years AS sy
         ON arc.school_year_id = sy.id
       INNER JOIN semesters AS sem
         ON arc.semester_id = sem.id
       INNER JOIN teachers AS t
         ON arc.teacher_id = t.id
       ${scopedTeacherDepartmentJoin}
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.status = 1
         AND arc.is_excluded = 0
         ${outerTeacherFilter}
       GROUP BY
         arc.teacher_id,
         arc.subject_id,
         rc.respondents,
         sy.name,
         sem.name,
         t.prefix,
         t.surname,
         t.givenname,
         t.suffix,
         s.code,
         s.name,
         d.name,
         c.name,
         cat.id,
         cat.name,
         i.id,
         i.number,
         i.question
       ORDER BY
         t.surname,
         t.givenname,
         s.code,
         cat.id,
         i.number`,
      [...periodParameters, ...periodParameters],
      (ratingError, ratings) => {
        if (ratingError) return callBack(ratingError);
        pool.query(
          `SELECT
             arc.teacher_id,
             arc.subject_id,
             arc.comment
           FROM academic_records_consolidated AS arc
             FORCE INDEX (idx_arc_rating_period)
           WHERE arc.school_year_id = ?
             AND arc.semester_id = ?
             AND arc.status = 1
             AND arc.is_excluded = 0
             ${outerTeacherFilter}
             AND arc.comment IS NOT NULL
             AND TRIM(arc.comment) <> ''
           ORDER BY arc.teacher_id, arc.subject_id, arc.id`,
          periodParameters,
          (commentError, comments) => {
            if (commentError) return callBack(commentError);
            return callBack(null, { ratings, comments });
          },
        );
      },
    );
  },

  getIndividualRating: (data, callBack) => {
    pool.query(
      `SELECT
         COUNT(DISTINCT arc.student_id) AS respondents,
         sy.name AS school_year,
         sem.name AS semester,
         CONCAT(IFNULL(CONCAT(t.prefix, ' '), ''), t.givenname, ' ', t.surname,
           IF(t.suffix IS NOT NULL AND t.suffix <> '', CONCAT(', ', t.suffix), '')) AS teacher_name,
         s.code AS subject,
         d.name AS department,
         c.name AS college,
         cat.name AS category,
         i.id AS item_id,
         i.number,
         i.question,
         ROUND(AVG(CAST(ti.rate AS FLOAT)), 3) AS mean
       FROM trans_item AS ti
       INNER JOIN academic_records_consolidated AS arc
         ON ti.transaction_id = arc.id
       INNER JOIN subjects AS s
         ON arc.subject_id = s.id
       INNER JOIN items AS i
         ON ti.item_id = i.id
       INNER JOIN categories AS cat
         ON i.category_id = cat.id
       INNER JOIN school_years AS sy
         ON arc.school_year_id = sy.id
       INNER JOIN semesters AS sem
         ON arc.semester_id = sem.id
       INNER JOIN teachers AS t
         ON arc.teacher_id = t.id
       ${scopedTeacherDepartmentJoin}
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.teacher_id = ?
         AND arc.subject_id = ?
         AND arc.is_excluded = 0
       GROUP BY
         i.id,
         sy.name,
         sem.name,
         t.prefix,
         t.surname,
         t.givenname,
         t.suffix,
         s.code,
         d.name,
         c.name,
         cat.name,
         i.number,
         i.question
       ORDER BY
         cat.id,
         i.number`,
      [data.school_year_id, data.semester_id, data.teacher_id, data.subject_id],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        return callBack(null, results);
      },
    );
  },

  getDepartmentalRating: (data, callBack) => {
    pool.query(
      `SELECT
         COUNT(DISTINCT arc.student_id) AS respondents,
         sy.name AS school_year,
         sem.name AS semester,
         d.name AS department,
         c.name AS college,
         cat.name AS category,
         i.id AS item_id,
         i.number,
         i.question,
         ROUND(AVG(CAST(ti.rate AS FLOAT)), 3) AS mean
       FROM trans_item AS ti
       INNER JOIN academic_records_consolidated AS arc
         ON ti.transaction_id = arc.id
       INNER JOIN subjects AS s
         ON arc.subject_id = s.id
       INNER JOIN items AS i
         ON ti.item_id = i.id
       INNER JOIN categories AS cat
         ON i.category_id = cat.id
       INNER JOIN school_years AS sy
         ON arc.school_year_id = sy.id
       INNER JOIN semesters AS sem
         ON arc.semester_id = sem.id
       INNER JOIN teachers AS t
         ON arc.teacher_id = t.id
       INNER JOIN academic_record_departments AS report_record_department
         ON report_record_department.academic_record_id = arc.id
       INNER JOIN departments AS d
         ON d.id = report_record_department.department_id
       INNER JOIN colleges AS c
         ON d.college_id = c.id
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND d.id = ?
         AND arc.is_excluded = 0
       GROUP BY
         i.id,
         sy.name,
         sem.name,
         d.name,
         c.name,
         cat.name,
         i.number,
         i.question
       ORDER BY
         cat.id,
         i.number`,
      [data.school_year_id, data.semester_id, data.department_id],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        return callBack(null, results);
      },
    );
  },

  getCollegiateRating: (data, callBack) => {
    pool.query(
      `SELECT
         COUNT(DISTINCT arc.student_id) AS respondents,
         sy.name AS school_year,
         sem.name AS semester,
         c.name AS college,
         cat.name AS category,
         i.id AS item_id,
         i.number,
         i.question,
         ROUND(AVG(CAST(ti.rate AS FLOAT)), 3) AS mean
       FROM trans_item AS ti
       INNER JOIN academic_records_consolidated AS arc
         ON ti.transaction_id = arc.id
       INNER JOIN subjects AS s
         ON arc.subject_id = s.id
       INNER JOIN items AS i
         ON ti.item_id = i.id
       INNER JOIN categories AS cat
         ON i.category_id = cat.id
       INNER JOIN school_years AS sy
         ON arc.school_year_id = sy.id
       INNER JOIN semesters AS sem
         ON arc.semester_id = sem.id
       INNER JOIN teachers AS t
         ON arc.teacher_id = t.id
       ${teacherCollegeAssignmentJoin}
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND c.id = ?
         AND arc.is_excluded = 0
       GROUP BY
         i.id,
         sy.name,
         sem.name,
         c.name,
         cat.name,
         i.number,
         i.question
       ORDER BY
         cat.id,
         i.number`,
      [data.school_year_id, data.semester_id, data.college_id],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        return callBack(null, results);
      },
    );
  },

  getComment: (data, callBack) => {
    pool.query(
      `SELECT arc.comment
       FROM academic_records_consolidated AS arc
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.subject_id = ?
         AND arc.teacher_id = ?
         AND arc.is_excluded = 0
         AND arc.comment IS NOT NULL
         AND TRIM(arc.comment) <> ''`,
      [data.school_year_id, data.semester_id, data.subject_id, data.teacher_id],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        return callBack(null, results);
      },
    );
  },

  getDepartmentalComment: (data, callBack) => {
    pool.query(
      `SELECT arc.comment
       FROM academic_records_consolidated AS arc
       INNER JOIN teachers AS t
         ON arc.teacher_id = t.id
       INNER JOIN academic_record_departments AS report_record_department
         ON report_record_department.academic_record_id = arc.id
       INNER JOIN departments AS d
         ON d.id = report_record_department.department_id
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND d.id = ?
         AND arc.is_excluded = 0
         AND arc.comment IS NOT NULL
         AND TRIM(arc.comment) <> ''`,
      [data.school_year_id, data.semester_id, data.department_id],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        return callBack(null, results);
      },
    );
  },

  getCollegiateComment: (data, callBack) => {
    pool.query(
      `SELECT arc.comment
       FROM academic_records_consolidated AS arc
       INNER JOIN teachers AS t
         ON arc.teacher_id = t.id
       ${teacherCollegeAssignmentJoin}
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND c.id = ?
         AND arc.is_excluded = 0
         AND arc.comment IS NOT NULL
         AND TRIM(arc.comment) <> ''`,
      [data.school_year_id, data.semester_id, data.college_id],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        return callBack(null, results);
      },
    );
  },

  getTeacherSubject: (data, callBack) => {
    pool.query(
      `SELECT
         sy.name AS school_year,
         sem.name AS semester,
         CONCAT(IFNULL(CONCAT(t.prefix, ' '), ''), t.givenname, ' ', t.surname,
           IF(t.suffix IS NOT NULL AND t.suffix <> '', CONCAT(', ', t.suffix), '')) AS teacher_name,
         s.code AS subject_code,
         s.id AS subject_id,
         s.name AS subject_name,
         d.name AS department,
         c.name AS college
       FROM academic_records_consolidated AS arc
       INNER JOIN subjects AS s
         ON arc.subject_id = s.id
       INNER JOIN school_years AS sy
         ON arc.school_year_id = sy.id
       INNER JOIN semesters AS sem
         ON arc.semester_id = sem.id
       INNER JOIN teachers AS t
         ON arc.teacher_id = t.id
       ${scopedTeacherDepartmentJoin}
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.teacher_id = ?
         AND arc.is_excluded = 0
       GROUP BY
         s.id,
         sy.name,
         sem.name,
         t.prefix,
         t.surname,
         t.givenname,
         t.suffix,
         s.code,
         s.name,
         d.name,
         c.name
       ORDER BY
         s.code`,
      [data.school_year_id, data.semester_id, data.teacher_id],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        return callBack(null, results);
      },
    );
  },

  getTeacherInformation: (data, callBack) => {
    pool.query(
      `SELECT
         sy.name AS school_year,
         sem.name AS semester,
         CONCAT(IFNULL(CONCAT(t.prefix, ' '), ''), t.givenname, ' ', t.surname,
           IF(t.suffix IS NOT NULL AND t.suffix <> '', CONCAT(', ', t.suffix), '')) AS teacher_name,
         d.name AS department,
         c.name AS college,
         ROUND(AVG(CAST(ti.rate AS FLOAT)), 3) AS mean
       FROM trans_item AS ti
       INNER JOIN academic_records_consolidated AS arc
         ON ti.transaction_id = arc.id
       INNER JOIN school_years AS sy
         ON arc.school_year_id = sy.id
       INNER JOIN semesters AS sem
         ON arc.semester_id = sem.id
       INNER JOIN teachers AS t
         ON arc.teacher_id = t.id
       ${scopedTeacherDepartmentJoin}
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.teacher_id = ?
         AND arc.is_excluded = 0
       GROUP BY
         sy.name,
         sem.name,
         t.prefix,
         t.surname,
         t.givenname,
         t.suffix,
         d.name,
         c.name`,
      [data.school_year_id, data.semester_id, data.teacher_id],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        return callBack(null, results[0]);
      },
    );
  },
};
