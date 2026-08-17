const pool = require("../../../db/db");

module.exports = {
  getOverallRanking: (data, callBack) => {
    pool.query(
      `SELECT 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         CONCAT(IFNULL(CONCAT(teachers.prefix, ' '), ''), teachers.givenname, ' ', teachers.surname,
           IF(teachers.suffix IS NOT NULL AND teachers.suffix <> '', CONCAT(', ', teachers.suffix), '')) AS teacher_name,
         teachers.is_part_time, 
         departments.name AS department, 
         colleges.name AS college, 
         ROUND(AVG(CAST(trans_item.rate AS float)), 2) AS mean
       FROM academic_records_consolidated AS arc
       INNER JOIN trans_item ON trans_item.transaction_id = arc.id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       INNER JOIN user_info AS student_info ON student_info.user_id = arc.student_id
       INNER JOIN courses AS student_courses ON student_courses.id = student_info.course_id
       INNER JOIN departments AS student_departments ON student_departments.id = student_courses.department_id
       INNER JOIN school_years ON arc.school_year_id = school_years.id
       INNER JOIN semesters ON arc.semester_id = semesters.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.is_excluded = 0
         AND teachers.is_part_time = ?
         AND UPPER(TRIM(student_departments.code)) <> 'SHS'
       GROUP BY 
         teachers.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         teachers.is_part_time,
         departments.name,
         colleges.name
       ORDER BY mean DESC`,
      [data.school_year_id, data.semester_id, data.is_part_time],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getOverallRankingSHS: (data, callBack) => {
    pool.query(
      `SELECT 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         CONCAT(IFNULL(CONCAT(teachers.prefix, ' '), ''), teachers.givenname, ' ', teachers.surname,
           IF(teachers.suffix IS NOT NULL AND teachers.suffix <> '', CONCAT(', ', teachers.suffix), '')) AS teacher_name,
         teachers.is_part_time, 
         departments.name AS department, 
         colleges.name AS college, 
         ROUND(AVG(CAST(trans_item.rate AS float)), 2) AS mean
       FROM academic_records_consolidated AS arc
       INNER JOIN trans_item ON trans_item.transaction_id = arc.id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       INNER JOIN user_info AS student_info ON student_info.user_id = arc.student_id
       INNER JOIN courses AS student_courses ON student_courses.id = student_info.course_id
       INNER JOIN departments AS student_departments ON student_departments.id = student_courses.department_id
       INNER JOIN school_years ON arc.school_year_id = school_years.id
       INNER JOIN semesters ON arc.semester_id = semesters.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.is_excluded = 0
         AND teachers.is_part_time = ?
         AND UPPER(TRIM(student_departments.code)) = 'SHS'
       GROUP BY 
         teachers.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         teachers.is_part_time,
         departments.name,
         colleges.name
       ORDER BY mean DESC`,
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
      `SELECT 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         CONCAT(IFNULL(CONCAT(teachers.prefix, ' '), ''), teachers.givenname, ' ', teachers.surname,
           IF(teachers.suffix IS NOT NULL AND teachers.suffix <> '', CONCAT(', ', teachers.suffix), '')) AS teacher_name,
         teachers.is_part_time, 
         departments.name AS department, 
         colleges.name AS college, 
         ROUND(AVG(CAST(trans_item.rate AS float)), 2) AS mean
       FROM academic_records_consolidated AS arc
       INNER JOIN trans_item ON trans_item.transaction_id = arc.id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       INNER JOIN school_years ON arc.school_year_id = school_years.id
       INNER JOIN semesters ON arc.semester_id = semesters.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.is_excluded = 0
         AND teachers.is_part_time = ?
         AND colleges.id = ?
       GROUP BY 
         teachers.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         teachers.is_part_time,
         departments.name,
         colleges.name
       ORDER BY mean DESC`,
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
      `SELECT 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         CONCAT(IFNULL(CONCAT(teachers.prefix, ' '), ''), teachers.givenname, ' ', teachers.surname,
           IF(teachers.suffix IS NOT NULL AND teachers.suffix <> '', CONCAT(', ', teachers.suffix), '')) AS teacher_name,
         teachers.is_part_time, 
         departments.name AS department, 
         colleges.name AS college, 
         ROUND(AVG(CAST(trans_item.rate AS float)), 2) AS mean
       FROM academic_records_consolidated AS arc
       INNER JOIN trans_item ON trans_item.transaction_id = arc.id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       INNER JOIN school_years ON arc.school_year_id = school_years.id
       INNER JOIN semesters ON arc.semester_id = semesters.id
       INNER JOIN departments ON teachers.department_id = departments.id
       INNER JOIN colleges ON departments.college_id = colleges.id
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.is_excluded = 0
         AND teachers.is_part_time = ?
         AND departments.id = ?
       GROUP BY 
         teachers.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         teachers.is_part_time,
         departments.name,
         colleges.name
       ORDER BY mean DESC`,
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
