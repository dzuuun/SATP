const pool = require("../../../db/db");

module.exports = {
  getIndividualRating: (data, callBack) => {
    pool.query(
      `SELECT 
         COUNT(DISTINCT transactions.user_id) AS respondents, 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         CONCAT(teachers.surname, ', ', teachers.givenname) AS teacher_name, 
         subjects.code AS subject, 
         departments.name AS department, 
         colleges.name AS college, 
         categories.name AS category, 
         items.id AS item_id,
         items.number, 
         items.question, 
         ROUND(AVG(CAST(trans_item.rate AS FLOAT)), 3) AS mean
       FROM trans_item
       INNER JOIN transactions ON trans_item.transaction_id = transactions.id
       INNER JOIN subjects ON transactions.subject_id = subjects.id
       INNER JOIN items ON trans_item.item_id = items.id
       INNER JOIN categories ON items.category_id = categories.id
       INNER JOIN school_years ON transactions.school_year_id = school_years.id
       INNER JOIN semesters ON transactions.semester_id = semesters.id
       INNER JOIN teachers ON transactions.teacher_id = teachers.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE transactions.school_year_id = ?
         AND transactions.semester_id = ?
         AND transactions.teacher_id = ?
         AND transactions.subject_id = ?
       GROUP BY 
         items.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         subjects.code,
         departments.name,
         colleges.name,
         categories.name,
         items.number,
         items.question`,
      [data.school_year_id, data.semester_id, data.teacher_id, data.subject_id],
      (error, results) => error ? callBack(error) : callBack(null, results)
    );
  },

  getDepartmentalRating: (data, callBack) => {
    pool.query(
      `SELECT 
         COUNT(DISTINCT transactions.user_id) AS respondents, 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         departments.name AS department, 
         colleges.name AS college, 
         categories.name AS category, 
         items.id AS item_id,
         items.number, 
         items.question, 
         ROUND(AVG(CAST(trans_item.rate AS FLOAT)), 3) AS mean
       FROM trans_item
       INNER JOIN transactions ON trans_item.transaction_id = transactions.id
       INNER JOIN subjects ON transactions.subject_id = subjects.id
       INNER JOIN items ON trans_item.item_id = items.id
       INNER JOIN categories ON items.category_id = categories.id
       INNER JOIN school_years ON transactions.school_year_id = school_years.id
       INNER JOIN semesters ON transactions.semester_id = semesters.id
       INNER JOIN teachers ON transactions.teacher_id = teachers.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE transactions.school_year_id = ?
         AND transactions.semester_id = ?
         AND departments.id = ?
       GROUP BY 
         items.id,
         school_years.name,
         semesters.name,
         departments.name,
         colleges.name,
         categories.name,
         items.number,
         items.question`,
      [data.school_year_id, data.semester_id, data.department_id],
      (error, results) => error ? callBack(error) : callBack(null, results)
    );
  },

  getCollegiateRating: (data, callBack) => {
    pool.query(
      `SELECT 
         COUNT(DISTINCT transactions.user_id) AS respondents, 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         colleges.name AS college, 
         categories.name AS category, 
         items.id AS item_id,
         items.number, 
         items.question, 
         ROUND(AVG(CAST(trans_item.rate AS FLOAT)), 3) AS mean
       FROM trans_item
       INNER JOIN transactions ON trans_item.transaction_id = transactions.id
       INNER JOIN subjects ON transactions.subject_id = subjects.id
       INNER JOIN items ON trans_item.item_id = items.id
       INNER JOIN categories ON items.category_id = categories.id
       INNER JOIN school_years ON transactions.school_year_id = school_years.id
       INNER JOIN semesters ON transactions.semester_id = semesters.id
       INNER JOIN teachers ON transactions.teacher_id = teachers.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE transactions.school_year_id = ?
         AND transactions.semester_id = ?
         AND colleges.id = ?
       GROUP BY 
         items.id,
         school_years.name,
         semesters.name,
         colleges.name,
         categories.name,
         items.number,
         items.question`,
      [data.school_year_id, data.semester_id, data.college_id],
      (error, results) => error ? callBack(error) : callBack(null, results)
    );
  },

  getComment: (data, callBack) => {
    pool.query(
      `SELECT comment 
       FROM transactions 
       WHERE school_year_id = ? 
         AND semester_id = ? 
         AND subject_id = ? 
         AND teacher_id = ? 
         AND comment IS NOT NULL`,
      [data.school_year_id, data.semester_id, data.subject_id, data.teacher_id],
      (error, results) => error ? callBack(error) : callBack(null, results)
    );
  },

  getDepartmentalComment: (data, callBack) => {
    pool.query(
      `SELECT transactions.comment 
       FROM transactions
       INNER JOIN teachers ON transactions.teacher_id = teachers.id
       INNER JOIN departments ON teachers.department_id = departments.id
       WHERE school_year_id = ?
         AND semester_id = ?
         AND departments.id = ?
         AND comment IS NOT NULL`,
      [data.school_year_id, data.semester_id, data.department_id],
      (error, results) => error ? callBack(error) : callBack(null, results)
    );
  },

  getCollegiateComment: (data, callBack) => {
    pool.query(
      `SELECT transactions.comment 
       FROM transactions
       INNER JOIN teachers ON transactions.teacher_id = teachers.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE school_year_id = ?
         AND semester_id = ?
         AND colleges.id = ?
         AND comment IS NOT NULL`,
      [data.school_year_id, data.semester_id, data.college_id],
      (error, results) => error ? callBack(error) : callBack(null, results)
    );
  },

  getTeacherSubject: (data, callBack) => {
    pool.query(
      `SELECT 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         CONCAT(teachers.surname, ', ', teachers.givenname) AS teacher_name, 
         subjects.code AS subject_code,
         subjects.id AS subject_id, 
         subjects.name AS subject_name, 
         departments.name AS department, 
         colleges.name AS college
       FROM transactions
       INNER JOIN subjects ON transactions.subject_id = subjects.id
       INNER JOIN school_years ON transactions.school_year_id = school_years.id
       INNER JOIN semesters ON transactions.semester_id = semesters.id
       INNER JOIN teachers ON transactions.teacher_id = teachers.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE transactions.school_year_id = ?
         AND transactions.semester_id = ?
         AND transactions.teacher_id = ?
       GROUP BY 
         subjects.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         subjects.code,
         subjects.name,
         departments.name,
         colleges.name`,
      [data.school_year_id, data.semester_id, data.teacher_id],
      (error, results) => error ? callBack(error) : callBack(null, results)
    );
  },

  getTeacherInformation: (data, callBack) => {
    pool.query(
      `SELECT 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         CONCAT(teachers.surname, ', ', teachers.givenname) AS teacher_name, 
         departments.name AS department, 
         colleges.name AS college, 
         ROUND(AVG(CAST(trans_item.rate AS FLOAT)), 3) AS mean
       FROM trans_item
       INNER JOIN transactions ON trans_item.transaction_id = transactions.id
       INNER JOIN school_years ON transactions.school_year_id = school_years.id
       INNER JOIN semesters ON transactions.semester_id = semesters.id
       INNER JOIN teachers ON transactions.teacher_id = teachers.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE transactions.school_year_id = ?
         AND transactions.semester_id = ?
         AND transactions.teacher_id = ?
       GROUP BY 
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         departments.name,
         colleges.name`,
      [data.school_year_id, data.semester_id, data.teacher_id],
      (error, results) => error ? callBack(error) : callBack(null, results[0])
    );
  },
};
