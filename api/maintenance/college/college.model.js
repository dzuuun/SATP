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
  updateCollege: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      const [collegeResult] = await connection.query(
        "UPDATE colleges SET code=?, name=?, is_active=? WHERE id=?",
        [data.code, data.name, data.is_active, data.id],
      );
      let departmentResult = { changedRows: 0 };
      let programResult = { changedRows: 0 };
      const targetActive = Number(data.is_active) === 1 ? 1 : 0;
      [departmentResult] = await connection.query(
        "UPDATE departments SET is_active = ? WHERE college_id = ? AND is_active <> ?",
        [targetActive, data.id, targetActive],
      );
      [programResult] = await connection.query(
        `UPDATE courses
         INNER JOIN departments ON departments.id = courses.department_id
         SET courses.is_active = ?
         WHERE departments.college_id = ? AND courses.is_active <> ?`,
        [targetActive, data.id, targetActive],
      );
      const changedRows = Number(collegeResult.changedRows || 0) +
        Number(departmentResult.changedRows || 0) + Number(programResult.changedRows || 0);
      if (changedRows) {
        await connection.query(
          "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
          [data.user_id,
            `Updated College: ${data.code}; ${targetActive ? "activated" : "deactivated"} ${departmentResult.changedRows || 0} department(s) and ${programResult.changedRows || 0} program(s)`],
        );
      }
      await connection.commit();
      return callBack(null, { ...collegeResult, changedRows });
    } catch (error) {
      if (connection) await connection.rollback();
      return callBack(error);
    } finally {
      connection?.release();
    }
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
