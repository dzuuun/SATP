const pool = require("../../../db/db");

module.exports = {
  getOverallRanking: (data, callBack) => {
    pool.query(
      `SELECT 
         school_years.name AS school_year, 
         semesters.name AS semester, 
         CONCAT(IFNULL(CONCAT(teachers.prefix, ' '), ''), teachers.givenname, ' ', teachers.surname,
           IF(teachers.suffix IS NOT NULL AND teachers.suffix <> '', CONCAT(', ', teachers.suffix), '')) AS teacher_name,
         COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status) AS is_part_time,
         departments.name AS department, 
         colleges.name AS college, 
         ROUND(AVG(CAST(trans_item.rate AS float)), 2) AS mean
       FROM academic_records_consolidated AS arc
       INNER JOIN trans_item ON trans_item.transaction_id = arc.id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       INNER JOIN user_info AS student_info ON student_info.user_id = arc.student_id
       INNER JOIN courses AS student_courses ON student_courses.id = student_info.course_id
       INNER JOIN departments AS student_departments ON student_departments.id = student_courses.department_id
       INNER JOIN colleges AS student_colleges ON student_colleges.id = student_departments.college_id
       INNER JOIN schools AS student_schools ON student_schools.id = student_colleges.school_id
       INNER JOIN school_years ON arc.school_year_id = school_years.id
       INNER JOIN semesters ON arc.semester_id = semesters.id
       INNER JOIN academic_record_departments AS record_department
         ON record_department.academic_record_id = arc.id
       INNER JOIN departments ON departments.id = record_department.department_id
       INNER JOIN colleges ON departments.college_id = colleges.id
       LEFT JOIN teacher_departments AS exact_assignment
         ON exact_assignment.teacher_id = arc.teacher_id
        AND exact_assignment.department_id = record_department.department_id
       INNER JOIN teacher_departments AS teaching_assignment
         ON teaching_assignment.teacher_id = arc.teacher_id
        AND teaching_assignment.department_id = (
          SELECT scoped_assignment.department_id
          FROM teacher_departments AS scoped_assignment
          INNER JOIN departments AS scoped_department
            ON scoped_department.id = scoped_assignment.department_id
          INNER JOIN colleges AS scoped_college
            ON scoped_college.id = scoped_department.college_id
          WHERE scoped_assignment.teacher_id = arc.teacher_id
            AND scoped_college.school_id = colleges.school_id
          ORDER BY scoped_assignment.is_primary DESC,
                   scoped_assignment.department_id
          LIMIT 1
        )
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.is_excluded = 0
         AND COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status) = ?
         AND UPPER(TRIM(student_schools.code)) <> 'SHS'
       GROUP BY 
         teachers.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status),
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
         COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status) AS is_part_time,
         departments.name AS department, 
         colleges.name AS college, 
         ROUND(AVG(CAST(trans_item.rate AS float)), 2) AS mean
       FROM academic_records_consolidated AS arc
       INNER JOIN trans_item ON trans_item.transaction_id = arc.id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       INNER JOIN user_info AS student_info ON student_info.user_id = arc.student_id
       INNER JOIN courses AS student_courses ON student_courses.id = student_info.course_id
       INNER JOIN departments AS student_departments ON student_departments.id = student_courses.department_id
       INNER JOIN colleges AS student_colleges ON student_colleges.id = student_departments.college_id
       INNER JOIN schools AS student_schools ON student_schools.id = student_colleges.school_id
       INNER JOIN school_years ON arc.school_year_id = school_years.id
       INNER JOIN semesters ON arc.semester_id = semesters.id
       INNER JOIN academic_record_departments AS record_department
         ON record_department.academic_record_id = arc.id
       INNER JOIN departments ON departments.id = record_department.department_id
       INNER JOIN colleges ON departments.college_id = colleges.id
       LEFT JOIN teacher_departments AS exact_assignment
         ON exact_assignment.teacher_id = arc.teacher_id
        AND exact_assignment.department_id = record_department.department_id
       INNER JOIN teacher_departments AS teaching_assignment
         ON teaching_assignment.teacher_id = arc.teacher_id
        AND teaching_assignment.department_id = (
          SELECT scoped_assignment.department_id
          FROM teacher_departments AS scoped_assignment
          INNER JOIN departments AS scoped_department
            ON scoped_department.id = scoped_assignment.department_id
          INNER JOIN colleges AS scoped_college
            ON scoped_college.id = scoped_department.college_id
          WHERE scoped_assignment.teacher_id = arc.teacher_id
            AND scoped_college.school_id = colleges.school_id
          ORDER BY scoped_assignment.is_primary DESC,
                   scoped_assignment.department_id
          LIMIT 1
        )
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.is_excluded = 0
         AND COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status) = ?
         AND UPPER(TRIM(student_schools.code)) = 'SHS'
       GROUP BY 
         teachers.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status),
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
         COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status) AS is_part_time,
         departments.name AS department, 
         colleges.name AS college, 
         ROUND(AVG(CAST(trans_item.rate AS float)), 2) AS mean
       FROM academic_records_consolidated AS arc
       INNER JOIN trans_item ON trans_item.transaction_id = arc.id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       INNER JOIN school_years ON arc.school_year_id = school_years.id
       INNER JOIN semesters ON arc.semester_id = semesters.id
       INNER JOIN academic_record_departments AS record_department
         ON record_department.academic_record_id = arc.id
       INNER JOIN departments ON departments.id = record_department.department_id
       INNER JOIN colleges ON departments.college_id = colleges.id
       LEFT JOIN teacher_departments AS exact_assignment
         ON exact_assignment.teacher_id = arc.teacher_id
        AND exact_assignment.department_id = record_department.department_id
       INNER JOIN teacher_departments AS teaching_assignment
         ON teaching_assignment.teacher_id = arc.teacher_id
        AND teaching_assignment.department_id = (
          SELECT scoped_assignment.department_id
          FROM teacher_departments AS scoped_assignment
          INNER JOIN departments AS scoped_department
            ON scoped_department.id = scoped_assignment.department_id
          INNER JOIN colleges AS scoped_college
            ON scoped_college.id = scoped_department.college_id
          WHERE scoped_assignment.teacher_id = arc.teacher_id
            AND scoped_college.school_id = colleges.school_id
          ORDER BY scoped_assignment.is_primary DESC,
                   scoped_assignment.department_id
          LIMIT 1
        )
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.is_excluded = 0
         AND COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status) = ?
         AND colleges.id = ?
       GROUP BY 
         teachers.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status),
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
         COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status) AS is_part_time,
         departments.name AS department, 
         colleges.name AS college, 
         ROUND(AVG(CAST(trans_item.rate AS float)), 2) AS mean
       FROM academic_records_consolidated AS arc
       INNER JOIN trans_item ON trans_item.transaction_id = arc.id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       INNER JOIN school_years ON arc.school_year_id = school_years.id
       INNER JOIN semesters ON arc.semester_id = semesters.id
       INNER JOIN academic_record_departments AS record_department
         ON record_department.academic_record_id = arc.id
       INNER JOIN departments ON departments.id = record_department.department_id
       INNER JOIN colleges ON departments.college_id = colleges.id
       LEFT JOIN teacher_departments AS exact_assignment
         ON exact_assignment.teacher_id = arc.teacher_id
        AND exact_assignment.department_id = record_department.department_id
       INNER JOIN teacher_departments AS teaching_assignment
         ON teaching_assignment.teacher_id = arc.teacher_id
        AND teaching_assignment.department_id = (
          SELECT scoped_assignment.department_id
          FROM teacher_departments AS scoped_assignment
          INNER JOIN departments AS scoped_department
            ON scoped_department.id = scoped_assignment.department_id
          INNER JOIN colleges AS scoped_college
            ON scoped_college.id = scoped_department.college_id
          WHERE scoped_assignment.teacher_id = arc.teacher_id
            AND scoped_college.school_id = colleges.school_id
          ORDER BY scoped_assignment.is_primary DESC,
                   scoped_assignment.department_id
          LIMIT 1
        )
       WHERE arc.school_year_id = ?
         AND arc.semester_id = ?
         AND arc.is_excluded = 0
         AND COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status) = ?
         AND departments.id = ?
       GROUP BY 
         teachers.id,
         school_years.name,
         semesters.name,
         teachers.surname,
         teachers.givenname,
         COALESCE(exact_assignment.teaching_status, teaching_assignment.teaching_status),
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
