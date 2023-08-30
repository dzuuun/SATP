const pool = require("../../../db/db");

module.exports = {
  getIndividualRating: (data, callBack) => {
    pool.query(
      "SELECT school_years.name AS school_year, semesters.name AS semester, CONCAT( teachers.surname, ', ', teachers.givenname ) AS teacher_name, subjects.code AS subject, departments.name AS department, colleges.name AS college, categories.name AS category, items.number, items.question, ROUND( AVG(CAST(trans_item.rate AS FLOAT)), 3 ) AS mean FROM trans_item INNER JOIN transactions ON trans_item.transaction_id = transactions.id INNER JOIN subjects ON transactions.subject_id = subjects.id INNER JOIN items ON trans_item.item_id = items.id INNER JOIN categories ON items.category_id = categories.id INNER JOIN school_years ON transactions.school_year_id = school_years.id INNER JOIN semesters ON transactions.semester_id = semesters.id INNER JOIN teachers ON transactions.teacher_id = teachers.id INNER JOIN departments ON teachers.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE transactions.school_year_id = ? AND transactions.semester_id = ? AND transactions.teacher_id = ? GROUP BY items.id;",
      [data.school_year_id, data.semester_id, data.teacher_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getComment: (data, callBack) => {
    pool.query(
      "SELECT comment FROM transactions WHERE school_year_id = ? AND semester_id = ? AND teacher_id = ? AND COMMENT IS NOT NULL",
      [data.school_year_id, data.semester_id, data.teacher_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
};
