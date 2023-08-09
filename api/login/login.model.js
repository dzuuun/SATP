const pool = require("../../db/db");

module.exports = {
  createUser: (data, callBack) => {
    pool.query(
      "SELECT username FROM users WHERE username=?",
      [data.username],
      (error, results) => {
        if (error) {
          callBack(error);
        }

        if (results.length === 0) {
          pool.query(
            "INSERT INTO users ( username, password, permission_id, is_temp_pass, is_student_rater, is_admin_rater, is_active) VALUES (?,?,?,?,?,?,?)",
            [
              data.username,
              data.password,
              data.permission_id,
              data.is_temp_pass,
              data.is_student_rater,
              data.is_admin_rater,
              data.is_active,
            ],
            (error, results) => {
              if (error) {
                callBack(error);
              }

              if (results.length === 1) {
                pool.query(
                  "INSERT INTO user_info (user_id, surname, givenname, middlename, course_id, year_level, gender) VALUES (?,?,?,?,?,?,?)",
                  [
                    results[0].user_id,
                    data.surname,
                    data.givenname,
                    data.middlename,
                    data.course_id,
                    data.year_level,
                    data.gender,
                  ],
                  (error, results) => {
                    if (error) {
                      callBack(error);
                    }

                    return callBack(null, results);
                  }
                );
              }
            }
          );
        }
      }
    );
  },

  getUsers: (callBack) => {
    pool.query(
      "SELECT * FROM users LEFT JOIN user_info ON users.id=user_info.user_id",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  checkPassword: (data, callBack) => {
    pool.query(
      "SELECT id, username, password, permission_id, is_temp_pass, is_student_rater, is_admin_rater, is_active FROM users WHERE id = ?",
      [data.id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  getUserByUserName: (username, callBack) => {
    pool.query(
      "SELECT * FROM users LEFT JOIN user_info ON users.id= user_info.user_id WHERE username = ?",
      [username],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  updateUser: (data, callBack) => {
    pool.query(
      "UPDATE users SET username=?, full_name=?, position=?, auth_level=? WHERE user_id = ?",
      [
        data.username,
        data.full_name,
        data.position,
        data.auth_level,
        data.user_id,
      ],
      (error, results, fields) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  updatePassword: (data, callBack) => {
    pool.query(
      "UPDATE users SET password=?, is_temp_pass=0 WHERE id=?",
      [data.password, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated User's Password"],
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
  },
};
