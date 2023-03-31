const pool = require("../../../db/db");

module.exports = {
  getUsers: (callBack) => {
    pool.query(
      "SELECT users.id, users.username, CONCAT( user_info.givenname, ' ', user_info.middlename, ' ', user_info.surname ) AS Name, permissions.name AS permission, users.is_temp_pass, users.is_student_rater, users.is_admin_rater, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN permissions ON users.permission_id=permissions.id",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getUserById: (Id, callBack) => {
    pool.query(
      "SELECT users.id, users.username, CONCAT( user_info.givenname, ' ', user_info.middlename, ' ', user_info.surname ) AS Name,  permissions.name AS permission, users.is_temp_pass, users.is_student_rater, users.is_admin_rater, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN permissions ON users.permission_id=permissions.id WHERE users.id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addUser: (data, callBack) => {
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
              data.is_student_rater,
              data.is_admin_rater,
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
                    [data.user_id, "Added User: " + data.username],
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

  updateUserControl: (data, callBack) => {
    pool.query(
      "SELECT username FROM users WHERE id=?",
      [data.id],
      (error, result) => {
        if (result.length == 1) {
          pool.query(
            "UPDATE users SET permission_id=?, is_temp_pass=?, is_student_rater=?, is_admin_rater=?, is_active=? WHERE id=?",
            [
              data.permission_id,
              data.is_temp_pass,
              data.is_student_rater,
              data.is_admin_rater,
              data.is_active,
              data.id,
            ],
            (error, results) => {
              if (results.changedRows == 1) {
                pool.query(
                  "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                  [
                    data.user_id,
                    "Updated User's Control: " + result[0].username,
                  ],
                  (error, results) => {
                    if (error) {
                      console.log(error);
                    }
                    console.log("Action added to Activity Log.");
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

  updateUserInfo: (data, callBack) => {
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
                    "Updated User's information: " + result[0].username,
                  ],
                  (error, results) => {
                    if (error) {
                      console.log(error);
                    }
                    console.log("Action added to Activity Log.");
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

  updateUserUsername: (data, callBack) => {
    pool.query(
      "UPDATE users SET username=? WHERE id=?",
      [data.username, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated User's username: " + data.username],
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

  // updateUserPassword: (data, callBack) => {
  //   pool.query(
  //     "SELECT username FROM users WHERE id=?",
  //     [data.id],
  //     (error, result) => {
  //       if (result.length == 1) {
  //         pool.query(
  //           "UPDATE users SET password=? WHERE id=?",
  //           [data.password, data.id],
  //           (error, results) => {
  //             if (results.changedRows == 1) {
  //               pool.query(
  //                 "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
  //                 [
  //                   data.user_id,
  //                   "Updated User's password: " + result[0].username,
  //                 ],
  //                 (error, results) => {
  //                   if (error) {
  //                     console.log(error);
  //                   }
  //                   console.log("Action added to Activity Log.");
  //                 }
  //               );
  //               if (error) {
  //                 callBack(error);
  //               }
  //             }
  //             return callBack(null, results);
  //           }
  //         );
  //       } else {
  //         return callBack(null, result);
  //       }
  //     }
  //   );
  // },

  deleteUser: (data, callBack) => {
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
                [data.user_id, "Deleted User: " + result[0].username],
                (error, results) => {
                  if (error) {
                    console.log(error);
                  }
                  console.log("Action added to Activity Log.");
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

  searchUsers: (data, callBack) => {
    pool.query(
      "SELECT users.id, users.username, CONCAT( user_info.givenname, ' ', user_info.middlename, ' ', user_info.surname ) AS NAME, permissions.name AS permission, users.is_temp_pass, users.is_student_rater, users.is_admin_rater, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN permissions ON users.permission_id = permissions.id WHERE user_info.givenname LIKE '%" +
        data.search +
        "%'  OR user_info.middlename LIKE '%" +
        data.search +
        "%' OR user_info.surname LIKE '%" +
        data.search +
        "%'",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
};
