const pool = require("../../../db/db");
const bcrypt = require("bcrypt");

module.exports = {
  getAllStudent: (data, callBack) => {
    pool.query(
      "SELECT users.id, users.username, users.google_email, user_info.surname, user_info.givenname, user_info.middlename, user_info.gender, user_info.year_level, CONCAT(user_info.surname, ', ', user_info.givenname) AS name, courses.code AS course, departments.id AS department_id, departments.code AS department_code, colleges.id AS college_id, colleges.code AS college, schools.id AS school_id, schools.code AS school_code, CASE WHEN UPPER(TRIM(schools.code)) = 'SHS' THEN 'SHS' ELSE 'COLLEGE' END AS academic_scope, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN courses ON user_info.course_id=courses.id INNER JOIN departments ON courses.department_id=departments.id INNER JOIN colleges ON departments.college_id=colleges.id INNER JOIN schools ON schools.id = colleges.school_id INNER JOIN users AS requesting_admin ON requesting_admin.id = ? WHERE users.is_student_rater = 1 AND (COALESCE(requesting_admin.admin_academic_scope, 'ALL') = 'ALL' OR requesting_admin.admin_academic_scope = CASE WHEN UPPER(TRIM(schools.code)) = 'SHS' THEN 'SHS' ELSE 'COLLEGE' END)",
      [data.requesting_user_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getAllActiveStudent: (data, callBack) => {
    pool.query(
      "SELECT users.id, users.username, CONCAT( user_info.givenname, ' ', user_info.surname ) AS name, courses.code AS course, departments.id AS department_id, departments.code AS department_code, colleges.id AS college_id, colleges.code AS college, schools.id AS school_id, schools.code AS school_code, CASE WHEN UPPER(TRIM(schools.code)) = 'SHS' THEN 'SHS' ELSE 'COLLEGE' END AS academic_scope, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN courses ON user_info.course_id=courses.id INNER JOIN departments ON courses.department_id=departments.id INNER JOIN colleges ON departments.college_id=colleges.id INNER JOIN schools ON schools.id = colleges.school_id INNER JOIN users AS requesting_admin ON requesting_admin.id = ? WHERE users.is_student_rater = 1 AND users.is_active = 1 AND (COALESCE(requesting_admin.admin_academic_scope, 'ALL') = 'ALL' OR requesting_admin.admin_academic_scope = CASE WHEN UPPER(TRIM(schools.code)) = 'SHS' THEN 'SHS' ELSE 'COLLEGE' END)",
      [data.requesting_user_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },


  getStudentById: (Id, callBack) => {
    pool.query(
      "SELECT users.id, users.username, users.google_email, user_info.givenname, user_info.surname, user_info.middlename, courses.id AS course_id, user_info.gender, user_info.year_level, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN courses ON user_info.course_id=courses.id WHERE users.is_student_rater = 1 AND users.id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  getStudentByUserName: (data, callBack) => {
    pool.query(
      "SELECT users.id, users.username, user_info.givenname, user_info.surname, user_info.middlename, courses.id AS course_id, user_info.gender, user_info.year_level, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN courses ON user_info.course_id=courses.id WHERE users.is_student_rater = 1 AND users.username = ?",
      [data.username],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addStudent: (data, callBack) => {
    let password;

    try {
      const plainTextPassword = String(data.password || "");

      if (!plainTextPassword && !String(data.google_email || "").trim()) {
        return callBack(new Error("A password or institutional email is required."));
      }

      password = plainTextPassword
        ? bcrypt.hashSync(plainTextPassword, 10)
        : null;
    } catch (error) {
      return callBack(error);
    }

    pool.query(
      "SELECT username FROM users WHERE username=?",
      [data.username],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO users (username, password, google_email, permission_id, is_temp_pass, is_student_rater, is_admin_rater, admin_academic_scope, is_active) VALUES (?,?,?,?,?,?,?,?,?)",
            [
              data.username,
              password,
              String(data.google_email || "").trim() || null,
              data.permission_id,
              data.is_temp_pass,
              1,
              0,
              null,
              data.is_active,
            ],
            (error, results) => {
              console.log(error)
              if (error) {
                callBack(error);
              }
              pool.query(
                "INSERT INTO user_info (user_id, surname, givenname, middlename, course_id, year_level, gender) VALUES (?,?,?,?,?,?,?)",
                [
                  results.insertId,
                  data.surname,
                  data.givenname,
                  data.middlename,
                  data.course_id,
                  data.year_level,
                  data.gender,
                ],
                (error, results) => {
                  pool.query(
                    "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                    [data.user_id, "Added Student: " + data.username],
                    (error, results) => {
                      if (error) {
                        console.log(error);
                      }
                    }
                  );
                  if (error) {
                    callBack(error);
                  }
                }
              );
              return callBack(null, results);
            }
          );
        } else {
          return callBack(results);
        }
      }
    );
  },

  updateStudentInfo: (data, callBack) => {
    pool.query(
      "SELECT users.username FROM users INNER JOIN user_info ON users.id = user_info.user_id WHERE user_id=?",
      [data.id],
      (error, result) => {
        if (result.length == 1) {
          pool.query(
            "UPDATE users INNER JOIN user_info ON users.id = user_info.user_id SET users.google_email=?, user_info.surname=?, user_info.givenname=?, user_info.middlename=?, user_info.course_id=?, user_info.year_level=?, user_info.gender=? WHERE users.id=?",
            [
              String(data.google_email || "").trim() || null,
              data.surname,
              data.givenname,
              data.middlename,
              data.course_id,
              data.year_level,
              data.gender,
              data.id,
            ],
            (error, results) => {
              if (results.changedRows == 1) {
                pool.query(
                  "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                  [
                    data.user_id,
                    "Updated Student's information: " + result[0].username,
                  ],
                  (error, results) => {
                    if (error) {
                      console.log(error);
                    }
                  }
                );
                if (error) {
                  callBack(error);
                }
              }
              return callBack(null, results);
            }
          );
        } else {
          return callBack(null, result);
        }
      }
    );
  },

  updateStudentActiveStatus: (data, callBack) => {
    pool.query(
      "SELECT users.username FROM users INNER JOIN user_info ON users.id = user_info.user_id WHERE user_id=?",
      [data.id],
      (error, result) => {
        if (result.length == 1) {
          pool.query(
            "UPDATE users SET is_active=? WHERE id=?",
              [data.is_active, data.id],
            (error, results) => {
              if (results.changedRows == 1) {
                pool.query(
                  "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                  [
                    data.user_id,
                    "Updated Student's active status: " + result[0].username,
                  ],
                  (error, results) => {
                    if (error) {
                      console.log(error);
                    }
                  }
                );
                if (error) {
                  callBack(error);
                }
              }
              return callBack(null, results);
            }
          );
        } else {
          return callBack(null, result);
        }
      }
    );

  },

  deleteStudent: (data, callBack) => {
    pool.query(
      "SELECT username FROM users WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM users WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted Student: " + result[0].username],
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
