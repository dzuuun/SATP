const pool = require("../../db/db");

modules.export = {
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
                    data.user_id,
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
      "SELECT * FROM users INNER JOIN user_info ON users.id=user_info.user_id",
      [],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getUserByUserId: (Id, callBack) => {
    pool.query(
      "SELECT * FROM users WHERE id = ?",
      [Id],
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
      "SELECT * FROM users FULL JOIN user_info ON users.id= user_info.user_id WHERE username = ?",
      [username],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },



};