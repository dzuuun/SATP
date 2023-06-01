const pool = require("../../../db/db");

module.exports = {
  getTeachers: (callback) => {
    pool.query(
      "SELECT teachers.id, CONCAT(teachers.givenname, ' ', teachers.surname) AS name, departments.code AS department_code, teachers.is_part_time, teachers.is_active  FROM teachers INNER JOIN departments on teachers.department_id=departments.id",
      (error, results) => {
        if (error) {
          callback(error);
        }
        return callback(null, results);
      }
    );
  },

  getTeacherById: (Id, callBack) => {
    pool.query(
      "SELECT teachers.id, teachers.givenname, teachers.surname, teachers.middlename, departments.id AS department_id, teachers.is_part_time, teachers.is_active FROM teachers INNER JOIN departments on teachers.department_id=departments.id WHERE teachers.id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addTeacher: (data, callBack) => {
    pool.query(
      "SELECT surname, givenname FROM teachers WHERE surname=? AND givenname=?",
      [data.surname, data.givenname],
      (error, results) => {
        if (results.length == 0) {
          pool.query(
            "INSERT INTO teachers (surname, givenname,middlename, department_id, is_part_time, is_active) VALUES (?,?,?,?,?,?)",
            [
              data.surname,
              data.givenname,
              data.middlename,
              data.department_id,
              data.is_part_time,
              data.is_active,
            ],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Added Teacher: " + data.givenname + " " + data.surname,
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
              return callBack(null, results);
            }
          );
        } else {
          return callBack(results);
        }
      }
    );
  },

  updateTeacher: (data, callBack) => {
    pool.query(
      "UPDATE teachers SET surname=?, givenname=?, middlename=?, department_id=?, is_part_time=?, is_active=? WHERE id=?",
      [
        data.surname,
        data.givenname,
        data.middlename,
        data.department_id,
        data.is_part_time,
        data.is_active,
        data.id,
      ],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [
              data.user_id,
              "Updated Teacher: " + data.givenname + " " + data.surname,
            ],
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

  deleteTeacher: (data, callBack) => {
    pool.query(
      "SELECT givenname, surname FROM teachers WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM teachers WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Deleted Teacher: " +
                    result[0].givenname +
                    " " +
                    result[0].surname,
                ],
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
