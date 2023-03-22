const pool = require("../../../db/db");

module.exports = {
  getDepartments: (callBack) => {
    pool.query(
      "SELECT departments.code, departments.name AS department_name, colleges.name AS college_name, departments.is_active FROM departments INNER JOIN colleges ON departments.college_id = colleges.id",
      [],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(results);
      }
    );
  },

  getDepartmentById: (Id, callBack) => {
    pool.query(
      "SELECT departments.code, departments.name AS department_name, colleges.name AS college_name, departments.is_active FROM departments INNER JOIN colleges ON departments.college_id = colleges.id WHERE departments.id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(results);
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
            "INSERT INTO departments(code, name, college_id, is_active) VALUES (?, ?, ?, ?)",
            [data.code, data.name, data.college_id, data.is_active],
            (error, results) => {
                pool.query(
                    "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                    [data.user_id, "Added Department: " + data.name],
                    (error, results) => {
                      if (error) {
                        console.log(error);
                      }
                      console.log(results);
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
        pool.query(
          "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
          [data.user_id, "Updated Department: " + data.name],
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
  },

  // deleteDepartment: (data, callBack) => {
  //   pool.query(
  //     "DELETE FROM departments WHERE id=?",
  //     [data.id],
  //     (error, results) => {
  //       if (error) {
  //         return callBack(error);
  //       }
  //       return callBack(null, results);
  //     }
  //   );
  // },
};
