const pool = require("../../../db/db");

module.exports = {
  getIncludedSubjectsByStudent: (data, callBack) => {
    pool.query(
      "SELECT student_subject.id, student_subject.student_id, student_subject.school_year_id, student_subject.semester_id, student_subject.subject_id, school_years.name AS school_year, semesters.name AS semester, subjects.code AS subject_code, subjects.name AS subject_name, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, student_subject.schedule_code, student_subject.time_start, student_subject.time_end, student_subject.day, rooms.name AS room, student_subject.is_excluded, student_subject.reason FROM student_subject INNER JOIN school_years ON student_subject.school_year_id = school_years.id INNER JOIN semesters ON student_subject.semester_id = semesters.id INNER JOIN subjects ON student_subject.subject_id = subjects.id INNER JOIN teachers ON student_subject.teacher_id = teachers.id INNER JOIN rooms ON student_subject.room_id=rooms.id INNER JOIN user_info ON student_subject.student_id = user_info.user_id WHERE student_subject.student_id=? AND student_subject.school_year_id=? AND student_subject.semester_id=?",
      [
        data.student_id,
        data.school_year_id,
        data.semester_id,
      ],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getIncludedSubjectsByStudentById: (id, callBack) => {
    pool.query(
      "SELECT student_subject.id, student_subject.student_id, student_subject.school_year_id, student_subject.semester_id, student_subject.subject_id, student_subject.teacher_id, school_years.name AS school_year, semesters.name AS semester, subjects.code AS subject_code, subjects.name AS subject_name, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, student_subject.schedule_code, student_subject.time_start, student_subject.time_end, student_subject.day, rooms.name AS room, student_subject.is_excluded, student_subject.reason FROM student_subject INNER JOIN school_years ON student_subject.school_year_id = school_years.id INNER JOIN semesters ON student_subject.semester_id = semesters.id INNER JOIN subjects ON student_subject.subject_id = subjects.id INNER JOIN teachers ON student_subject.teacher_id = teachers.id INNER JOIN rooms ON student_subject.room_id=rooms.id INNER JOIN user_info ON student_subject.student_id = user_info.user_id WHERE student_subject.id=?",
      [id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getAllSubjectsByStudent: (data, callBack) => {
    pool.query(
      "SELECT student_subject.id, student_subject.student_id, student_subject.school_year_id, student_subject.semester_id, student_subject.subject_id, school_years.name AS school_year, semesters.name AS semester, subjects.code AS subject_code, subjects.name AS subject_name, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, student_subject.schedule_code, student_subject.time_start, student_subject.time_end, student_subject.day, rooms.name AS room, student_subject.is_excluded, student_subject.reason FROM student_subject INNER JOIN school_years ON student_subject.school_year_id = school_years.id INNER JOIN semesters ON student_subject.semester_id = semesters.id INNER JOIN subjects ON student_subject.subject_id = subjects.id INNER JOIN teachers ON student_subject.teacher_id = teachers.id INNER JOIN rooms ON student_subject.room_id=rooms.id INNER JOIN user_info ON student_subject.student_id = user_info.user_id WHERE student_subject.student_id=? AND student_subject.school_year_id=? AND student_subject.semester_id=?  AND student_subject.is_excluded=1",
      [
        data.student_id,
        data.school_year_id,
        data.semester_id,
        // data.is_excluded,
      ],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  showReason: (data, callBack) => {
    pool.query(
      "SELECT `reason` FROM `student_subject` WHERE id=?",
      [data.id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  // getExcludedSubjects: (callBack) => {
  //   pool.query(
  //     "SELECT student_subject.student_id, student_subject.school_year_id, student_subject.semester_id, student_subject.subject_id, school_years.name AS school_year, semesters.name AS semester, subjects.code AS subject_code, subjects.name AS subject_name, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, student_subject.schedule_code, student_subject.time_start, student_subject.time_end, student_subject.day, rooms.name AS room, student_subject.is_excluded, student_subject.reason FROM student_subject INNER JOIN school_years ON student_subject.school_year_id = school_years.id INNER JOIN semesters ON student_subject.semester_id = semesters.id INNER JOIN subjects ON student_subject.subject_id = subjects.id INNER JOIN teachers ON student_subject.teacher_id = teachers.id INNER JOIN rooms ON student_subject.room_id=rooms.id INNER JOIN user_info ON student_subject.student_id = user_info.user_id WHERE student_subject.is_excluded=1",
  //     (error, results) => {
  //       if (error) {
  //         callBack(error);
  //       }
  //       return callBack(null, results);
  //     }
  //   );
  // },

  // add
  addStudentSubject: (data, callBack) => {
    pool.query(
      "SELECT user_info.user_id, school_years.name AS school_year, semesters.name AS semester, subjects.code AS subject_code, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name FROM student_subject INNER JOIN school_years ON student_subject.school_year_id = school_years.id INNER JOIN semesters ON student_subject.semester_id = semesters.id INNER JOIN subjects ON student_subject.subject_id = subjects.id INNER JOIN teachers ON student_subject.teacher_id = teachers.id INNER JOIN rooms ON student_subject.room_id=rooms.id INNER JOIN user_info ON student_subject.student_id = user_info.user_id WHERE student_subject.student_id=? AND student_subject.school_year_id=? AND student_subject.semester_id=? AND student_subject.subject_id=? AND student_subject.is_excluded=0",
      [data.student_id, data.school_year_id, data.semester_id, data.subject_id],
      (error, result) => {
        if (result.length === 0) {
          pool.query(
            "INSERT INTO student_subject (school_year_id, semester_id, subject_id, teacher_id, student_id, schedule_code, time_start, time_end, day, room_id, is_excluded) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            [
              data.school_year_id,
              data.semester_id,
              data.subject_id,
              data.teacher_id,
              data.student_id,
              data.schedule_code,
              data.time_start,
              data.time_end,
              data.day,
              data.room_id,
              data.is_excluded,
            ],
            (error, results) => {
              pool.query(
                "SELECT user_info.user_id, school_years.name AS school_year, semesters.name AS semester, subjects.code AS subject_code, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name FROM student_subject INNER JOIN school_years ON student_subject.school_year_id = school_years.id INNER JOIN semesters ON student_subject.semester_id = semesters.id INNER JOIN subjects ON student_subject.subject_id = subjects.id INNER JOIN teachers ON student_subject.teacher_id = teachers.id INNER JOIN rooms ON student_subject.room_id=rooms.id INNER JOIN user_info ON student_subject.student_id = user_info.user_id WHERE student_subject.student_id=? AND student_subject.school_year_id=? AND student_subject.semester_id=? AND student_subject.subject_id=?",
                [
                  data.student_id,
                  data.school_year_id,
                  data.semester_id,
                  data.subject_id,
                ],
                (error, result) => {
                  pool.query(
                    "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP,?)",
                    [
                      data.user_id,
                      "Added Student's subject: " +
                        result[0].school_year +
                        " | " +
                        result[0].semester +
                        " | " +
                        result[0].subject_code +
                        " | " +
                        result[0].teacher_name,
                    ],
                    (error, results) => {
                      if (error) {
                        console.log(error);
                      }
                    }
                  );
                  if (error) {
                    console.log(error);
                  }
                }
              );
              if (error) {
                callBack(error);
              }
              return callBack(null, results);
            }
          );
        } else {
          return callBack(result);
        }
      }
    );
  },
  // // update
  // updateStudentSubject: (data, callBack) => {
  //   pool.query(
  //     "UPDATE student_subject SET school_year_id=?,semester_id=?,subject_id=?,teacher_id=?,student_id=?,schedule_code=?,time_start=?,time_end=?,day=?,room_id=? WHERE student_subject.student_id=? AND student_subject.school_year_id=? AND student_subject.semester_id=? AND student_subject.subject_id=?",
  //     [
  //       data.school_year_id,
  //       data.semester_id,
  //       data.subject_id,
  //       data.teacher_id,
  //       data.student_id,
  //       data.schedule_code,
  //       data.time_start,
  //       data.time_end,
  //       data.day,
  //       data.room_id,
  //       data.student_id,
  //       data.school_year_id,
  //       data.semester_id,
  //       data.subject_id,
  //     ],
  //     (error, results) => {
  //       if (results.changedRows == 1) {
  //         pool.query(
  //           "SELECT user_info.user_id, school_years.name AS school_year, semesters.name AS semester, subjects.code AS subject_code, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name FROM student_subject INNER JOIN school_years ON student_subject.school_year_id = school_years.id INNER JOIN semesters ON student_subject.semester_id = semesters.id INNER JOIN subjects ON student_subject.subject_id = subjects.id INNER JOIN teachers ON student_subject.teacher_id = teachers.id INNER JOIN rooms ON student_subject.room_id=rooms.id INNER JOIN user_info ON student_subject.student_id = user_info.user_id WHERE student_subject.student_id=? AND student_subject.school_year_id=? AND student_subject.semester_id=? AND student_subject.subject_id=?",
  //           [
  //             data.student_id,
  //             data.school_year_id,
  //             data.semester_id,
  //             data.subject_id,
  //           ],
  //           (error, result) => {
  //             pool.query(
  //               "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
  //               [
  //                 data.user_id,
  //                 "Updated Student's subject: " +
  //                   result[0].school_year +
  //                   " | " +
  //                   result[0].semester +
  //                   " | " +
  //                   result[0].subject_code +
  //                   " | " +
  //                   result[0].teacher_name,
  //               ],
  //               (error, results) => {
  //                 if (error) {
  //                   console.log(error);
  //                 }
  //               }
  //             );
  //             if (error) {
  //               console.log(error);
  //             }
  //           }
  //         );
  //       }
  //       if (error) {
  //         callBack(error);
  //       }
  //       return callBack(null, results);
  //     }
  //   );
  // },

  deactivateStudentSubject: (data, callBack) => {
    pool.query(
      "SELECT user_info.user_id, school_years.name AS school_year, semesters.name AS semester, subjects.code AS subject_code, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name FROM student_subject INNER JOIN school_years ON student_subject.school_year_id = school_years.id INNER JOIN semesters ON student_subject.semester_id = semesters.id INNER JOIN subjects ON student_subject.subject_id = subjects.id INNER JOIN teachers ON student_subject.teacher_id = teachers.id INNER JOIN rooms ON student_subject.room_id=rooms.id INNER JOIN user_info ON student_subject.student_id = user_info.user_id WHERE student_subject.id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "UPDATE student_subject SET student_subject.is_excluded=?, student_subject.reason=? WHERE student_subject.id =?",
          [data.is_excluded, data.reason, data.id],
          (error, results) => {
            if (results.changedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Deleted Student's subject: " +
                    result[0].school_year +
                    " | " +
                    result[0].semester +
                    " | " +
                    result[0].subject_code +
                    " | " +
                    result[0].teacher_name,
                ],
                (error, results) => {
                  if (error) {
                    console.log(error);
                  }
                }
              );
            }
            if (error) {
              callBack(error);
            }
            return callBack(null, results);
          }
        );
        if (error) {
          return callBack(error);
        }
      }
    );
  },
};
