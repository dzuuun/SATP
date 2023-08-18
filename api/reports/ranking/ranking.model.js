const pool = require("../../../db/db");

module.exports = {
  getOverallRanking: (data, callBack) => {
    pool.query(
      "SELECT school_years.name AS school_year, semesters.name AS semester, CONCAT( teachers.surname, ', ', teachers.givenname ) AS teacher_name, teachers.is_part_time, departments.name AS department, colleges.name AS college, ROUND(AVG(CAST(trans_item.rate AS float)), 2) as mean FROM teachers INNER JOIN transactions ON teachers.id = transactions.teacher_id INNER JOIN trans_item ON transactions.id = trans_item.transaction_id INNER JOIN school_years ON transactions.school_year_id = school_years.id INNER JOIN semesters ON transactions.semester_id = semesters.id INNER JOIN departments ON teachers.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE transactions.school_year_id = ? AND transactions.semester_id = ? AND teachers.is_part_time = ? GROUP BY teachers.id ORDER BY mean DESC",
      [data.school_year_id, data.semester_id, data.is_part_time],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getCollegiateRanking: (data, callBack) => {
    pool.query(
      "SELECT school_years.name AS school_year, semesters.name AS semester, CONCAT( teachers.surname, ', ', teachers.givenname ) AS teacher_name, teachers.is_part_time, departments.name AS department, colleges.name AS college, ROUND(AVG(CAST(trans_item.rate AS float)), 2) as mean FROM teachers INNER JOIN transactions ON teachers.id = transactions.teacher_id INNER JOIN trans_item ON transactions.id = trans_item.transaction_id INNER JOIN school_years ON transactions.school_year_id = school_years.id INNER JOIN semesters ON transactions.semester_id = semesters.id INNER JOIN departments ON teachers.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE transactions.school_year_id = ? AND transactions.semester_id = ? AND teachers.is_part_time = ? AND colleges.id = ? GROUP BY teachers.id ORDER BY mean DESC",
      [
        data.school_year_id,
        data.semester_id,
        data.is_part_time,
        data.colleges_id,
      ],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getDepartmentalRanking: (data, callBack) => {
    pool.query(
      "SELECT school_years.name AS school_year, semesters.name AS semester, CONCAT( teachers.surname, ', ', teachers.givenname ) AS teacher_name, teachers.is_part_time, departments.name AS department, colleges.name AS college, ROUND(AVG(CAST(trans_item.rate AS float)), 2) as mean FROM teachers INNER JOIN transactions ON teachers.id = transactions.teacher_id INNER JOIN trans_item ON transactions.id = trans_item.transaction_id INNER JOIN school_years ON transactions.school_year_id = school_years.id INNER JOIN semesters ON transactions.semester_id = semesters.id INNER JOIN departments ON teachers.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE transactions.school_year_id = ? AND transactions.semester_id = ? AND teachers.is_part_time = ? AND departments.id = ? GROUP BY teachers.id ORDER BY mean DESC",
      [
        data.school_year_id,
        data.semester_id,
        data.is_part_time,
        data.departments_id,
      ],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
};
