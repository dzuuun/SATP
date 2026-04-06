const pool = require("../../../db/db");

module.exports = {
    // updated for new table
  getTransactions: (data, callBack) => {
    pool.query(
      // "SELECT transactions.id, transactions.user_id, school_years.name AS school_year, semesters.name AS semester, transactions.status, users.username, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, subjects.code AS subject_code, courses.name AS course, departments.name AS department, colleges.name AS college, colleges.code AS college_code, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teachers_name FROM transactions INNER JOIN users ON transactions.user_id = users.id INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN subjects ON transactions.subject_id = subjects.id INNER JOIN teachers ON transactions.teacher_id = teachers.id INNER JOIN school_years ON transactions.school_year_id=school_years.id INNER JOIN semesters ON transactions.semester_id=semesters.id INNER JOIN courses ON user_info.course_id = courses.id INNER JOIN departments ON courses.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE transactions.school_year_id=? AND transactions.semester_id=?",
      "SELECT school_years.name AS SchoolYear, semesters.name AS Semester, users.username AS IDNumber, CONCAT( user_info.surname, ', ', user_info.givenname ) AS FullName, user_info.year_level AS YearLevel, courses.name AS Course, departments.name AS Department, colleges.name AS College, COUNT(academic_records_consolidated.subject_id) AS TotalSubjects, SUM( CASE WHEN academic_records_consolidated.status = 0 THEN 1 ELSE 0 END ) AS PendingStatusCount FROM academic_records_consolidated INNER JOIN users ON academic_records_consolidated.student_id = users.id INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN school_years ON academic_records_consolidated.school_year_id = school_years.id INNER JOIN semesters ON academic_records_consolidated.semester_id = semesters.id INNER JOIN courses ON user_info.course_id = courses.id INNER JOIN departments ON courses.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE academic_records_consolidated.school_year_id = ? AND academic_records_consolidated.semester_id = ? GROUP BY users.id, school_years.id, semesters.id ORDER BY Course, Department, user_info.surname;",
      [data.school_year_id, data.semester_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

    // updated for new table
  getTransactionsByStudent: (data, callBack) => {
    pool.query(
      "SELECT academic_records_consolidated.id, academic_records_consolidated.status, academic_records_consolidated.student_id, school_years.name AS school_year, semesters.name AS semester, academic_records_consolidated.status, users.username, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, subjects.code AS subject_code, subjects.name AS subject_name, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teachers_name FROM academic_records_consolidated INNER JOIN users ON academic_records_consolidated.student_id = users.id INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN subjects ON academic_records_consolidated.subject_id = subjects.id INNER JOIN teachers ON academic_records_consolidated.teacher_id = teachers.id INNER JOIN school_years ON academic_records_consolidated.school_year_id = school_years.id INNER JOIN semesters ON academic_records_consolidated.semester_id = semesters.id WHERE academic_records_consolidated.school_year_id = ? AND academic_records_consolidated.semester_id = ? AND users.username = ?",
      [data.school_year_id, data.semester_id, data.student_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

    // updated for new table
  getSYSemData: (data, callBack) => {
    pool.query(
      "SELECT COUNT(*) AS TotalStudents, SUM(CASE WHEN PendingStatusCount = 0 THEN 1 ELSE 0 END) AS FullyRatedCount, SUM(CASE WHEN PendingStatusCount > 0 THEN 1 ELSE 0 END) AS IncompleteCount FROM ( SELECT student_id, SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS PendingStatusCount FROM academic_records_consolidated WHERE school_year_id = ? AND semester_id = ? GROUP BY student_id ) AS StudentSummaries;",
      [data.school_year_id, data.semester_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  getTransactionInfoById: (Id, callBack) => {
    pool.query(
      "SELECT transactions.id, transactions.status, transactions.user_id, school_years.name AS school_year, semesters.name AS semester, transactions.status, users.username, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, subjects.code AS subject_code, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teachers_name FROM transactions INNER JOIN users ON transactions.user_id = users.id INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN subjects ON transactions.subject_id = subjects.id INNER JOIN teachers ON transactions.teacher_id = teachers.id INNER JOIN school_years ON transactions.school_year_id=school_years.id INNER JOIN semesters ON transactions.semester_id=semesters.id  WHERE transactions.id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  getCommentByTransactionId: (Id, callBack) => {
    pool.query(
      "SELECT comment FROM transactions WHERE id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  addTransaction: (data, callBack) => {
    pool.query(
      "SELECT id FROM transactions WHERE school_year_id=? AND semester_id=? AND subject_id=? AND teacher_id=? AND user_id=?",
      [
        data.school_year_id,
        data.semester_id,
        data.subject_id,
        data.teacher_id,
        data.id,
      ],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO transactions(school_year_id, semester_id, subject_id, teacher_id, user_id) VALUES (?,?,?,?,?)",
            [
              data.school_year_id,
              data.semester_id,
              data.subject_id,
              data.teacher_id,
              data.id,
            ],
            (error, result) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added Transaction No. " + result.insertId],
                (error, results) => {
                  if (error) {
                    console.log(error);
                  }
                },
              );
              if (error) {
                callBack(error);
              }
              return callBack(null, result);
            },
          );
        } else {
          return callBack(results);
        }
      },
    );
  },

  // submitRating: (data, callBack) => {
  //   pool.query(
  //     "INSERT INTO trans_item (transaction_id, item_id, rate) VALUES (?,?,?)",
  //     [data.transaction_id, data.item_id, data.rate],
  //     (error, results) => {
  //       if (error) {
  //         callBack(error);
  //       }
  //       return callBack(null, results);
  //     }
  //   );
  // },

  submitRating: (data, callBack) => {
    pool.query(
      "SELECT * FROM trans_item WHERE transaction_id = ? AND item_id = ?",
      [data.transaction_id, data.item_id],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO trans_item (transaction_id, item_id, rate) VALUES (?,?,?)",
            [data.transaction_id, data.item_id, data.rate],
            (error, results) => {
              if (error) {
                callBack(error);
              }
              return callBack(null, results);
            },
          );
        } else {
          return callBack(results);
        }
      },
    );
  },

  submitCommentStatus: (data, callBack) => {
    pool.query(
      "SELECT CONCAT( user_info.givenname, ' ', user_info.surname ) AS name, transactions.id FROM transactions INNER JOIN user_info ON transactions.user_id = user_info.user_id WHERE id = ?",
      [data.transaction_id],
      (error, results) => {
        if (results.length === 1) {
          pool.query(
            "UPDATE transactions SET comment=?, status=? WHERE id=?",
            [data.comment, 1, data.transaction_id],
            (error, result) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "User: " +
                    results[0].name +
                    " rated Transaction No. " +
                    data.transaction_id,
                ],
                (error, results) => {
                  if (error) {
                    console.log(error);
                  }
                },
              );
              if (error) {
                callBack(error);
              }
              return callBack(null, result);
            },
          );
        } else {
          return callBack(results);
        }
      },
    );
  },

  // updated for new table
  getNotRatedTransactions: (data, callBack) => {
    pool.query(
      "SELECT school_years.name AS SchoolYear, semesters.name AS Semester, users.username AS IDNumber, user_info.givenname AS FirstName, user_info.surname AS LastName, user_info.year_level AS YearLevel, courses.name AS Course, departments.name AS Department, colleges.name AS College, subjects.code AS SubjectCode, CONCAT( teachers.surname, ', ', teachers.givenname ) AS Teacher FROM academic_records_consolidated INNER JOIN users ON academic_records_consolidated.student_id = users.id INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN subjects ON academic_records_consolidated.subject_id = subjects.id INNER JOIN teachers ON academic_records_consolidated.teacher_id = teachers.id INNER JOIN school_years ON academic_records_consolidated.school_year_id = school_years.id INNER JOIN semesters ON academic_records_consolidated.semester_id = semesters.id INNER JOIN courses ON user_info.course_id = courses.id INNER JOIN departments ON courses.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE academic_records_consolidated.school_year_id = ? AND academic_records_consolidated.semester_id = ? AND academic_records_consolidated.status = 0 ORDER BY course, department",
      [data.school_year_id, data.semester_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },
};
