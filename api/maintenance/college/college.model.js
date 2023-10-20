const pool = require("../../../db/db");

module.exports = {
  getColleges: (callBack) => {
    pool.query("SELECT * FROM colleges", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getActiveColleges: (callBack) => {
    pool.query(
      "SELECT * FROM colleges WHERE is_active = 1",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getCollegeById: (Id, callBack) => {
    pool.query(
      "SELECT * FROM colleges WHERE id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  getCollegeByCode: (data, callBack) => {
    pool.query(
      "SELECT colleges.id, colleges.code, colleges.name, departments.id AS department_id, colleges.is_active FROM colleges INNER JOIN departments ON departments.college_id = colleges.id WHERE colleges.code = ?",
      [data.college_code],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addCollege: (data, callBack) => {
    pool.query(
      "SELECT code FROM colleges WHERE code=?",
      [data.code],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO colleges (code, name, is_active) VALUES (?,?,?)",
            [data.code, data.name, data.is_active],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added College: " + data.code],
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
  updateCollege: (data, callBack) => {
    pool.query(
      "UPDATE colleges SET code=?, name=?, is_active=? WHERE id=?",
      [data.code, data.name, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated College: " + data.code],
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
  deleteCollege: (data, callBack) => {
    pool.query(
      "SELECT code FROM colleges WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM colleges WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted College: " + result[0].code],
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
