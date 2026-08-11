const pool = require("../../../db/db");

module.exports = {
  bulkDeactivateUsers: (data, callBack) => {
    pool.getConnection((connectionError, connection) => {
      if (connectionError) return callBack(connectionError);
      const finishWithError = (error) =>
        connection.rollback(() => {
          connection.release();
          callBack(error);
        });
      connection.beginTransaction((transactionError) => {
        if (transactionError) {
          connection.release();
          return callBack(transactionError);
        }
        const placeholders = data.usernames.map(() => "?").join(",");
        connection.query(
          `SELECT id, username, is_active FROM users WHERE username IN (${placeholders}) FOR UPDATE`,
          data.usernames,
          (selectError, users) => {
            if (selectError) return finishWithError(selectError);
            const activeUsers = users.filter(
              (user) =>
                Number(user.is_active) === 1 &&
                Number(user.id) !== Number(data.user_id),
            );
            if (!activeUsers.length) {
              return connection.commit((commitError) => {
                connection.release();
                callBack(commitError, { deactivated: 0 });
              });
            }
            const ids = activeUsers.map((user) => user.id);
            connection.query(
              `UPDATE users SET is_active=0 WHERE id IN (${ids.map(() => "?").join(",")})`,
              ids,
              (updateError, updateResult) => {
                if (updateError) return finishWithError(updateError);
                const names = activeUsers.map((user) => user.username);
                const description = names.length > 20
                  ? `${names.slice(0, 20).join(", ")} and ${names.length - 20} more`
                  : names.join(", ");
                connection.query(
                  "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                  [data.user_id, `Bulk deactivated users: ${description}`],
                  (logError) => {
                    if (logError) return finishWithError(logError);
                    connection.commit((commitError) => {
                      if (commitError) return finishWithError(commitError);
                      connection.release();
                      callBack(null, { deactivated: updateResult.changedRows });
                    });
                  },
                );
              },
            );
          },
        );
      });
    });
  },

  getUsers: (callBack) => {
    pool.query(
      "SELECT users.id, users.username, CONCAT( user_info.givenname, ' ', user_info.middlename, ' ', user_info.surname ) AS Name, permissions.name AS permission, users.is_temp_pass, users.is_student_rater, users.is_admin_rater, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN permissions ON users.permission_id=permissions.id",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  getUserById: (Id, callBack) => {
    pool.query(
      "SELECT users.id, users.username, users.password, user_info.givenname, user_info.middlename, user_info.surname,user_info.gender, user_info.course_id, user_info.year_level,  users.permission_id, permissions.name AS permission, users.is_temp_pass, users.is_student_rater, users.is_admin_rater, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN permissions ON users.permission_id=permissions.id WHERE users.id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      },
    );
  },

  updateUser: (data, callBack) => {
    pool.getConnection((connectionError, connection) => {
      if (connectionError) return callBack(connectionError);

      const fail = (error) => {
        connection.rollback(() => {
          connection.release();
          callBack(error);
        });
      };

      connection.beginTransaction((transactionError) => {
        if (transactionError) {
          connection.release();
          return callBack(transactionError);
        }

        const userFields = [
          data.username,
          data.permission_id,
          data.is_temp_pass,
          data.is_student_rater,
          data.is_admin_rater,
          data.is_active,
        ];
        const passwordClause = data.password ? ", password=?" : "";
        if (data.password) userFields.push(data.password);
        userFields.push(data.id);

        connection.query(
          `UPDATE users SET username=?, permission_id=?, is_temp_pass=?, is_student_rater=?, is_admin_rater=?, is_active=?${passwordClause} WHERE id=?`,
          userFields,
          (userError, userResult) => {
            if (userError) return fail(userError);

            connection.query(
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
              (profileError, profileResult) => {
                if (profileError) return fail(profileError);

                const changedRows =
                  userResult.changedRows + profileResult.changedRows;
                if (!changedRows) {
                  return connection.commit((commitError) => {
                    connection.release();
                    callBack(commitError, { changedRows: 0 });
                  });
                }

                connection.query(
                  "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
                  [data.user_id, `Updated User: ${data.username}`],
                  (logError) => {
                    if (logError) return fail(logError);
                    connection.commit((commitError) => {
                      if (commitError) return fail(commitError);
                      connection.release();
                      callBack(null, { changedRows });
                    });
                  },
                );
              },
            );
          },
        );
      });
    });
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
                    },
                  );
                  if (error) {
                    callBack(error);
                  }
                },
              );
              return callBack(null, results);
            },
          );
        } else {
          return callBack(results);
        }
      },
    );
  },

  updateUserControl: (data, callBack) => {
    pool.query(
      "SELECT username FROM users WHERE id=?",
      [data.id],
      (error, result) => {
        if (result.length == 1) {
          pool.query(
            "UPDATE users SET permission_id=?, is_student_rater=?, is_admin_rater=? WHERE id=?",
            [
              data.permission_id,
              data.is_student_rater,
              data.is_admin_rater,
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
                  },
                );
                if (error) {
                  callBack(error);
                }
              }
              return callBack(null, results);
            },
          );
        } else {
          return callBack(null, result);
        }
      },
    );
  },

  updateUserInfo: (data, callBack) => {
    pool.query(
      "SELECT users.username FROM users INNER JOIN user_info ON users.id = user_info.user_id WHERE user_info.user_id=?",
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
                  },
                );
                if (error) {
                  callBack(error);
                }
              } else {
              }
              return callBack(null, results);
            },
          );
        } else {
          return callBack(null, result);
        }
      },
    );
  },

  updateUserCredentials: (data, callBack) => {
    pool.query(
      "UPDATE users SET username=?, password=?, is_temp_pass=? WHERE id=?",
      [data.username, data.password, data.is_temp_pass, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated User's credentials: " + data.username],
            (error, results) => {
              if (error) {
                console.log(error);
              }
            },
          );
        }
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  updateStatus: (data, callBack) => {
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
                    "Updated User's status: " + result[0].username,
                  ],
                  (error, results) => {
                    if (error) {
                      console.log(error);
                    }
                  },
                );
                if (error) {
                  callBack(error);
                }
              }
              return callBack(null, results);
            },
          );
        } else {
          return callBack(null, result);
        }
      },
    );
  },

  updatePassword: (data, callBack) => {
    pool.query(
      "SELECT users.id FROM users INNER JOIN user_info ON users.id = user_info.user_id WHERE username = ?",
      [data.username],
      (error, result) => {
        if (error) {
          return callBack(error); // Return early on error
        }

        if (result.length === 1) {
          // User found, proceed with password update
          pool.query(
            "UPDATE users SET password = ? WHERE id = ?",
            [data.password, result[0].id],
            (error, updateResult) => {
              if (error) {
                return callBack(error); // Return early on error
              }

              if (updateResult.changedRows === 1) {
                // Log activity after successful password update
                pool.query(
                  "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
                  [data.user_id, `Updated User's Password: ${data.username}`],
                  (error) => {
                    if (error) {
                      console.log("Activity Log Error:", error); // Log the error but don't interrupt flow
                    }
                  },
                );
              }

              return callBack(null, updateResult); // Success callback
            },
          );
        } else {
          return callBack(null, result); // User not found, send result back
        }
      },
    );
  },

  getUserByUserName: (data, callBack) => {
    pool.query(
      "SELECT users.id, users.username, user_info.givenname, user_info.surname, user_info.middlename, courses.id AS course_id, user_info.gender, user_info.year_level, users.is_active FROM users INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN courses ON user_info.course_id=courses.id WHERE users.is_student_rater = 1 AND users.username = ?",
      [data.username],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      },
    );
  },
};
