const pool = require("../../../db/db");

module.exports = {
  getColleges: (callBack) => {
    pool.query("SELECT colleges.*, schools.code AS school_code, schools.name AS school_name FROM colleges INNER JOIN schools ON schools.id = colleges.school_id ORDER BY colleges.code", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getActiveColleges: (callBack) => {
    pool.query(
      "SELECT colleges.*, schools.code AS school_code, schools.name AS school_name FROM colleges INNER JOIN schools ON schools.id = colleges.school_id WHERE colleges.is_active = 1 AND schools.is_active = 1 ORDER BY colleges.code",
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
      "SELECT colleges.*, schools.code AS school_code, schools.name AS school_name FROM colleges INNER JOIN schools ON schools.id = colleges.school_id WHERE colleges.id = ?",
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
      "SELECT colleges.id, colleges.code, colleges.name, colleges.school_id, schools.code AS school_code, departments.id AS department_id, colleges.is_active FROM colleges INNER JOIN schools ON schools.id = colleges.school_id INNER JOIN departments ON departments.college_id = colleges.id WHERE colleges.code = ?",
      [data.college_code],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addCollege: async (data, callBack) => {
    try {
      const [schools] = await pool
        .promise()
        .query("SELECT is_active FROM schools WHERE id = ?", [data.school_id]);
      if (!schools.length) throw new Error("School not found.");
      if (Number(data.is_active) === 1 && !Number(schools[0].is_active)) {
        throw new Error("An active college must belong to an active school.");
      }
      const [existing] = await pool
        .promise()
        .query("SELECT id FROM colleges WHERE code = ?", [data.code]);
      if (existing.length) throw new Error("College code already exists.");
      const [result] = await pool
        .promise()
        .query(
          "INSERT INTO colleges (code, name, school_id, is_active) VALUES (?,?,?,?)",
          [data.code, data.name, data.school_id, data.is_active],
        );
      await pool
        .promise()
        .query(
          "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
          [data.user_id, `Added College: ${data.code}`],
        );
      return callBack(null, result);
    } catch (error) {
      return callBack(error);
    }
  },
  updateCollege: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      const [currentColleges] = await connection.query(
        "SELECT is_active FROM colleges WHERE id = ? FOR UPDATE",
        [data.id],
      );
      if (!currentColleges.length) throw new Error("College not found.");
      const targetActive = Number(data.is_active) === 1 ? 1 : 0;
      const [parentSchools] = await connection.query(
        "SELECT is_active FROM schools WHERE id = ?",
        [data.school_id],
      );
      if (!parentSchools.length) throw new Error("School not found.");
      if (targetActive && !Number(parentSchools[0].is_active)) {
        throw new Error("Activate the parent school before activating this college.");
      }
      const statusChanged = Number(currentColleges[0].is_active) !== targetActive;
      const [collegeResult] = await connection.query(
        "UPDATE colleges SET code=?, name=?, school_id=?, is_active=? WHERE id=?",
        [data.code, data.name, data.school_id, data.is_active, data.id],
      );
      let departmentResult = { changedRows: 0 };
      let programResult = { changedRows: 0 };
      if (statusChanged) {
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
      }
      const changedRows = Number(collegeResult.changedRows || 0) +
        Number(departmentResult.changedRows || 0) + Number(programResult.changedRows || 0);
      if (changedRows) {
        await connection.query(
          "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
          [data.user_id, statusChanged
            ? `Updated College: ${data.code}; ${targetActive ? "activated" : "deactivated"} ${departmentResult.changedRows || 0} department(s) and ${programResult.changedRows || 0} program(s)`
            : `Updated College: ${data.code}`],
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
