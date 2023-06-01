const pool = require("../../../db/db");

module.exports = {
  getCourses: (callBack) => {
    pool.query(
      "SELECT courses.id, courses.code, courses.name, departments.code AS department_code, courses.is_active FROM courses INNER JOIN departments ON courses.department_id = departments.id",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getCourseById: (Id, callBack) => {
    pool.query(
      "SELECT courses.id, courses.code, courses.name, departments.id AS department_id,  courses.is_active FROM courses INNER JOIN departments ON courses.department_id = departments.id WHERE courses.id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addCourse: (data, callBack) => {
    pool.query(
      "SELECT code FROM courses WHERE code=?",
      [data.code],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO courses (code, name, department_id, is_active) VALUES (?,?,?,?)",
            [data.code, data.name, data.department_id, data.is_active],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added Course: " + data.code],
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

  updateCourse: (data, callBack) => {
    pool.query(
      "UPDATE courses SET code=?, name=?, department_id=?, is_active=? WHERE id=?",
      [data.code, data.name, data.department_id, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated Course: " + data.code],
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

  deleteCourse: (data, callBack) => {
    pool.query(
      "SELECT code FROM courses WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM courses WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted Course: " + result[0].code],
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
