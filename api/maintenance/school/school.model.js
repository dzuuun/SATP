const pool = require("../../../db/db");

const listQuery = `SELECT schools.id, schools.code, schools.name,
  schools.is_active,
  COUNT(DISTINCT colleges.id) AS college_count
  FROM schools
  LEFT JOIN colleges ON colleges.school_id = schools.id`;

module.exports = {
  getSchools: (callBack) => {
    pool.query(
      `${listQuery} GROUP BY schools.id ORDER BY schools.code`,
      callBack,
    );
  },

  getActiveSchools: (callBack) => {
    pool.query(
      `${listQuery} WHERE schools.is_active = 1 GROUP BY schools.id ORDER BY schools.code`,
      callBack,
    );
  },

  getSchoolById: (id, callBack) => {
    pool.query("SELECT * FROM schools WHERE id = ?", [id], (error, rows) =>
      callBack(error, rows?.[0]),
    );
  },

  addSchool: (data, callBack) => {
    const code = String(data.code || "").trim().toUpperCase();
    const name = String(data.name || "").trim();
    if (!code || !name) {
      return callBack(new Error("Code and name are required."));
    }
    pool.query("SELECT id FROM schools WHERE code = ?", [code], (error, rows) => {
      if (error) return callBack(error);
      if (rows.length) return callBack(new Error("School code already exists."));
      pool.query(
        "INSERT INTO schools (code, name, is_active) VALUES (?,?,?)",
        [code, name, Number(data.is_active) === 1 ? 1 : 0],
        (insertError, result) => {
          if (insertError) return callBack(insertError);
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, `Added School: ${code}`],
            () => callBack(null, result),
          );
        },
      );
    });
  },

  updateSchool: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      const [current] = await connection.query(
        "SELECT code, is_active FROM schools WHERE id = ? FOR UPDATE",
        [data.id],
      );
      if (!current.length) throw new Error("School not found.");
      const targetActive = Number(data.is_active) === 1 ? 1 : 0;
      const statusChanged = Number(current[0].is_active) !== targetActive;
      const [schoolResult] = await connection.query(
        "UPDATE schools SET code = ?, name = ?, is_active = ? WHERE id = ?",
        [data.code, data.name, targetActive, data.id],
      );
      let collegeResult = { changedRows: 0 };
      let departmentResult = { changedRows: 0 };
      let programResult = { changedRows: 0 };
      if (statusChanged) {
        [collegeResult] = await connection.query(
          "UPDATE colleges SET is_active = ? WHERE school_id = ? AND is_active <> ?",
          [targetActive, data.id, targetActive],
        );
        [departmentResult] = await connection.query(
          `UPDATE departments
           INNER JOIN colleges ON colleges.id = departments.college_id
           SET departments.is_active = ?
           WHERE colleges.school_id = ? AND departments.is_active <> ?`,
          [targetActive, data.id, targetActive],
        );
        [programResult] = await connection.query(
          `UPDATE courses
           INNER JOIN departments ON departments.id = courses.department_id
           INNER JOIN colleges ON colleges.id = departments.college_id
           SET courses.is_active = ?
           WHERE colleges.school_id = ? AND courses.is_active <> ?`,
          [targetActive, data.id, targetActive],
        );
      }
      const changedRows =
        Number(schoolResult.changedRows || 0) +
        Number(collegeResult.changedRows || 0) +
        Number(departmentResult.changedRows || 0) +
        Number(programResult.changedRows || 0);
      if (changedRows) {
        const cascade = statusChanged
          ? `; ${targetActive ? "activated" : "deactivated"} ${collegeResult.changedRows || 0} college(s), ${departmentResult.changedRows || 0} department(s), and ${programResult.changedRows || 0} program(s)`
          : "";
        await connection.query(
          "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
          [data.user_id, `Updated School: ${data.code}${cascade}`],
        );
      }
      await connection.commit();
      return callBack(null, { ...schoolResult, changedRows });
    } catch (error) {
      if (connection) await connection.rollback();
      return callBack(error);
    } finally {
      connection?.release();
    }
  },
};
