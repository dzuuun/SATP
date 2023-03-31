const pool = require("../../../db/db");

module.exports = {
  getSubjectsByStudent: (data, callBack) => {
    pool.query(
      "SELECT user_info.user_id, school_years.name AS school_year, semesters.name AS semester, subjects.code AS subject_code, subjects.name AS subject_name, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, student_subject.schedule_code, student_subject.time_start, student_subject.time_end, student_subject.day, student_subject.room FROM student_subject INNER JOIN school_years ON student_subject.school_year_id = school_years.id INNER JOIN semesters ON student_subject.semester_id = semesters.id INNER JOIN subjects ON student_subject.subject_id = subjects.id INNER JOIN teachers ON student_subject.teacher_id = teachers.id INNER JOIN user_info ON student_subject.student_id = user_info.user_id WHERE user_info.user_id =? AND school_years.id=? AND semesters.id=?",
      [data.student_id, data.school_year_id, data.semester_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

};
