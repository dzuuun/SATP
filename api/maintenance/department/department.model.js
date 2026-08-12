const pool = require("../../../db/db");

module.exports = {
  getDepartments: (callBack) => {
    pool.query(
      "SELECT departments.id, departments.code AS department_code, departments.name, colleges.code AS college_code, departments.is_active FROM departments INNER JOIN colleges ON departments.college_id = colleges.id ORDER BY departments.code",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getActiveDepartments: (callBack) => {
    pool.query(
      "SELECT departments.id, departments.code AS department_code, departments.name, colleges.code AS college_code, departments.is_active FROM departments INNER JOIN colleges ON departments.college_id = colleges.id WHERE departments.is_active = 1 ORDER BY departments.code",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getDepartmentById: (Id, callBack) => {
    pool.query(
      "SELECT departments.id, departments.code, departments.name, colleges.id AS college_id, departments.is_active FROM departments INNER JOIN colleges ON departments.college_id = colleges.id WHERE departments.id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  getDepartmentByCode: (data, callBack) => {
    pool.query(
      "SELECT departments.id, departments.code, departments.name, colleges.id AS college_id, departments.is_active FROM departments INNER JOIN colleges ON departments.college_id = colleges.id WHERE departments.code = ?",
      [data.department_code],
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

  updateDepartment: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      const [departmentResult] = await connection.query(
        "UPDATE departments SET code = ?, name = ?, college_id = ?, is_active = ? WHERE id = ?",
        [data.code, data.name, data.college_id, data.is_active, data.id],
      );
      let programResult = { changedRows: 0 };
      const targetActive = Number(data.is_active) === 1 ? 1 : 0;
      [programResult] = await connection.query(
        "UPDATE courses SET is_active = ? WHERE department_id = ? AND is_active <> ?",
        [targetActive, data.id, targetActive],
      );
      const changedRows = Number(departmentResult.changedRows || 0) +
        Number(programResult.changedRows || 0);
      if (changedRows) {
        await connection.query(
          "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
          [data.user_id,
            `Updated Department: ${data.code}; ${targetActive ? "activated" : "deactivated"} ${programResult.changedRows || 0} program(s)`],
        );
      }
      await connection.commit();
      return callBack(null, { ...departmentResult, changedRows });
    } catch (error) {
      if (connection) await connection.rollback();
      return callBack(error);
    } finally {
      connection?.release();
    }
  },

  deleteDepartment: (data, callBack) => {
    pool.query(
      "SELECT code FROM departments WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM departments WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted Department: " + result[0].code],
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
