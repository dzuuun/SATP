const pool = require("../../../db/db");

module.exports = {
  getDepartments: (callBack) => {
    pool.query("SELECT * FROM departments", [], (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getDepartmentById: (Id, callBack) => {
    pool.query(
      "SELECT * FROM departments WHERE id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addDepartment: (data, callBack) => {
    pool.query(
      "SELECT code FROM departments WHERE code=?",
      [data.code],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO departments (code, name, college_id, is_active) VALUES (?,?,?,?)",
            [data.code, data.name, data.college_id, data.is_active],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added Department: " + data.code],
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

  updateDepartment: (data, callBack) => {
    pool.query(
      "UPDATE departments SET code = ?, name = ?, college_id = ?, is_active = ? WHERE id = ?",
      [data.code, data.name, data.college_id, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated Department: " + data.code],
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

  deleteDepartment: (data, callBack) => {
    pool.query(
      "DELETE FROM departments WHERE id=?",
      [data.id],
      (error, results) => {
        if (results.affectedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Deleted Department: " + data.code],
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

  searchDepartments: (data, callBack) => {
    pool.query(
      "SELECT code, name, college_id, is_active FROM departments WHERE code LIKE '%" +
        data.search +
        "%'  OR name LIKE '%" +
        data.search +
        "%'  OR college_id LIKE '%" +
        data.search +
        "%' OR is_active LIKE '%" +
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
