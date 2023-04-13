const pool = require("../../../db/db");

module.exports = {
  getIndividualRating: (data, callBack) => {
    pool.query(
      "SELECT school_years.name AS school_year, semesters.name AS semester, CONCAT( teachers.surname, ', ', teachers.givenname ) AS teacher_name, departments.name AS department, colleges.name AS college, categories.name, items.number, items.question, ROUND( AVG(CAST(trans_item.rate AS FLOAT)), 3 ) AS mean FROM trans_item INNER JOIN transactions ON trans_item.transaction_id = transactions.id INNER JOIN items ON trans_item.item_id = items.id INNER JOIN categories ON items.category_id = categories.id INNER JOIN school_years ON transactions.school_year_id = school_years.id INNER JOIN semesters ON transactions.semester_id = semesters.id INNER JOIN teachers ON transactions.teacher_id = teachers.id INNER JOIN departments ON teachers.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id where transactions.teacher_id=? and transactions.subject_id=? GROUP BY items.id",
      [data.teacher_id, data.subject_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
};
