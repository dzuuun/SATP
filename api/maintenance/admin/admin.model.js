const pool = require("../../../db/db");

module.exports = {
  getAllAdmin: (callBack) => {
    pool.query(
      "SELECT users.id, users.username, CONCAT( user_info.givenname, ' ', user_info.surname ) AS name, courses.code, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN courses ON user_info.course_id=courses.id WHERE users.is_admin_rater = 1",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getAdminById: (Id, callBack) => {
    pool.query(
      "SELECT users.id, users.username, CONCAT( user_info.givenname, ' ', user_info.surname ) AS name, courses.code, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN courses ON user_info.course_id=courses.id WHERE users.is_admin_rater = 1 AND users.id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addAdmin: (data, callBack) => {
    pool.query(
      "SELECT username FROM users WHERE username=?",
      [data.username],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO users (username, password, permission_id, is_temp_pass, is_student_rater, is_admin_rater, is_active) VALUES (?,?,?,?,?,?,?)",
            [
              data.username,
              data.password,
              data.permission_id,
              data.is_temp_pass,
              0,
              1,
              data.is_active,
            ],
            (error, results) => {
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
                    [data.user_id, "Added Admin: " + data.username],
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

  updateAdminInfo: (data, callBack) => {
    pool.query(
      "SELECT users.username FROM users INNER JOIN user_info ON users.id = user_info.user_id WHERE user_id=?",
      [data.id],
      (error, result) => {
        if (result.length == 1) {
          pool.query(
            "UPDATE user_info SET surname=?, givenname=?, middlename=?, course_id=?, year_level=?, gender=? WHERE user_id=?",
            [
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
                    "Updated Admin's information: " + result[0].username,
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

  updateAdminUsername: (data, callBack) => {
    pool.query(
      "UPDATE users SET username=? WHERE id=?",
      [data.username, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated Admin's username: " + data.username],
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

  // update password

  deleteAdmin: (data, callBack) => {
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
                [data.user_id, "Deleted Admin: " + result[0].username],
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

  searchAdmins: (data, callBack) => {
    pool.query(
      "SELECT users.id, users.username, CONCAT( user_info.givenname, ' ', user_info.middlename, ' ', user_info.surname ) AS NAME, permissions.name AS permission, users.is_temp_pass, users.is_student_rater, users.is_admin_rater, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN permissions ON users.permission_id = permissions.id WHERE users.is_admin_rater = 1 AND (user_info.givenname LIKE '%" +
        data.search +
        "%'  OR user_info.middlename LIKE '%" +
        data.search +
        "%' OR user_info.surname LIKE '%" +
        data.search +
        "%' OR users.username LIKE '%" +
        data.search +
        "%')",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
};
