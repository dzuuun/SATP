const pool = require("../../../db/db");
const bcrypt = require("bcrypt");

module.exports = {
  getAllAdmin: (callBack) => {
    pool.query(
      "SELECT users.id, users.username, users.google_email, CONCAT( user_info.givenname, ' ', user_info.surname ) AS name, permissions.name AS permission, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN permissions ON users.permission_id = permissions.id WHERE users.is_admin_rater = 1",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getAllActiveAdmin: (callBack) => {
    pool.query(
      "SELECT users.id, users.username, CONCAT( user_info.givenname, ' ', user_info.surname ) AS name, permissions.name AS permission, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN permissions ON users.permission_id = permissions.id WHERE users.is_admin_rater = 1 AND users.is_active = 1",
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
      "SELECT users.id, users.username, users.google_email, user_info.givenname, user_info.surname, user_info.middlename, user_info.gender, users.permission_id, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id WHERE users.is_admin_rater = 1 AND users.id=?",
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
            "INSERT INTO users (username, password, google_email, permission_id, is_temp_pass, is_student_rater, is_admin_rater, is_active) VALUES (?,?,?,?,?,?,?,?)",
            [
              data.username,
              password,
              String(data.google_email || "").trim().toLowerCase() || null,
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
                "INSERT INTO user_info (user_id, surname, givenname, middlename, gender) VALUES (?,?,?,?,?)",
                [
                  results.insertId,
                  data.surname,
                  data.givenname,
                  data.middlename,
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
                    // callBack(error);
                    console.log(error);
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
    pool.getConnection((connectionError, connection) => {
      if (connectionError) return callBack(connectionError);
      const rollback = (error) =>
        connection.rollback(() => {
          connection.release();
          callBack(error);
        });

      connection.beginTransaction((transactionError) => {
        if (transactionError) {
          connection.release();
          return callBack(transactionError);
        }
        connection.query(
          "SELECT username FROM users WHERE id=? AND is_admin_rater=1 FOR UPDATE",
          [data.id],
          (selectError, admins) => {
            if (selectError) return rollback(selectError);
            if (!admins.length) {
              return connection.commit((commitError) => {
                connection.release();
                callBack(commitError, { changedRows: 0 });
              });
            }
            connection.query(
              "UPDATE user_info SET surname=?, givenname=?, middlename=?, gender=? WHERE user_id=?",
              [
                data.surname,
                data.givenname,
                data.middlename,
                data.gender,
                data.id,
              ],
              (profileError, profileResult) => {
                if (profileError) return rollback(profileError);
                connection.query(
                  "UPDATE users SET google_email=?, permission_id=? WHERE id=?",
                  [
                    String(data.google_email || "").trim().toLowerCase() || null,
                    data.permission_id,
                    data.id,
                  ],
                  (permissionError, permissionResult) => {
                    if (permissionError) return rollback(permissionError);
                    const changedRows =
                      profileResult.changedRows + permissionResult.changedRows;
                    if (!changedRows) {
                      return connection.commit((commitError) => {
                        connection.release();
                        callBack(commitError, { changedRows: 0 });
                      });
                    }
                    connection.query(
                      "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                      [
                        data.user_id,
                        `Updated Admin information and permission: ${admins[0].username}`,
                      ],
                      (logError) => {
                        if (logError) return rollback(logError);
                        connection.commit((commitError) => {
                          if (commitError) return rollback(commitError);
                          connection.release();
                          callBack(null, { changedRows });
                        });
                      },
                    );
                  },
                );
              },
            );
          },
        );
      });
    });
  },

  updateAdminActiveStatus: (data, callBack) => {
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
                    "Updated Admin's active status: " + result[0].username,
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
};
