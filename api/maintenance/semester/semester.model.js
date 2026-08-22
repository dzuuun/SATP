const pool = require("../../../db/db");

module.exports = {
  getSemesters: (callBack) => {
    pool.query("SELECT * FROM semesters", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getActiveSemesters: (callBack) => {
    pool.query("SELECT * FROM semesters WHERE is_active = 1", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getInUseSemester: (callBack) => {
    pool.query(
      `SELECT *
       FROM semesters
       WHERE in_use = 1
       `,
      (error, results) => {
        if (error) {
          return callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  getCurrentSemesterForStudent: (userId, callBack) => {
    pool.query(
      `SELECT semesters.*,
        CASE WHEN UPPER(TRIM(schools.code)) = 'SHS' THEN 'shs' ELSE 'college' END AS academic_group
       FROM user_info
       INNER JOIN courses ON courses.id = user_info.course_id
       INNER JOIN departments ON departments.id = courses.department_id
       INNER JOIN colleges ON colleges.id = departments.college_id
       INNER JOIN schools ON schools.id = colleges.school_id
       INNER JOIN semesters ON semesters.is_active = 1
         AND ((UPPER(TRIM(schools.code)) = 'SHS' AND semesters.is_current_shs = 1)
           OR (UPPER(TRIM(schools.code)) <> 'SHS' AND semesters.is_current_college = 1))
       WHERE user_info.user_id = ?
       LIMIT 1`,
      [userId],
      (error, results) => callBack(error, results?.[0]),
    );
  },

  getCurrentSemesterForAdmin: (userId, callBack) => {
    pool.query(
      `SELECT semesters.*,
         COALESCE(users.admin_academic_scope, 'ALL') AS academic_scope
       FROM users
       INNER JOIN semesters ON semesters.is_active = 1
         AND (
           (users.admin_academic_scope = 'SHS' AND semesters.is_current_shs = 1)
           OR (COALESCE(users.admin_academic_scope, 'ALL') IN ('COLLEGE', 'ALL')
             AND semesters.is_current_college = 1)
         )
       WHERE users.id = ? AND users.is_admin_rater = 1
       LIMIT 1`,
      [userId],
      (error, results) => callBack(error, results?.[0]),
    );
  },

  getSemesterById: (Id, callBack) => {
    pool.query(
      "SELECT * FROM semesters WHERE id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addSemester: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      const [existing] = await connection.query("SELECT id FROM semesters WHERE name = ?", [data.name]);
      if (existing.length) {
        const duplicateError = new Error("Semester already exists.");
        duplicateError.code = "ER_DUP_ENTRY";
        throw duplicateError;
      }
      if (Number(data.is_current_college) === 1) {
        await connection.query("UPDATE semesters SET is_current_college = 0");
      }
      if (Number(data.is_current_shs) === 1) {
        await connection.query("UPDATE semesters SET is_current_shs = 0");
      }
      const [results] = await connection.query(
        "INSERT INTO semesters (name, in_use, is_current_college, is_current_shs, is_active) VALUES (?,?,?,?,?)",
        [data.name, data.in_use, data.is_current_college, data.is_current_shs, data.is_active],
      );
      await connection.query(
        "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
        [data.user_id, `Added Semester: ${data.name}`],
      );
      await connection.commit();
      return callBack(null, results);
    } catch (error) {
      if (connection) await connection.rollback();
      return callBack(error);
    } finally {
      connection?.release();
    }
  },

  updateSemester: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      if (Number(data.is_current_college) === 1) {
        await connection.query("UPDATE semesters SET is_current_college = 0 WHERE id <> ?", [data.id]);
      }
      if (Number(data.is_current_shs) === 1) {
        await connection.query("UPDATE semesters SET is_current_shs = 0 WHERE id <> ?", [data.id]);
      }
      const [results] = await connection.query(
        "UPDATE semesters SET name = ?, in_use = ?, is_current_college = ?, is_current_shs = ?, is_active = ? WHERE id = ?",
        [data.name, data.in_use, data.is_current_college, data.is_current_shs, data.is_active, data.id],
      );
      if (results.changedRows === 1) {
        await connection.query(
          "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
          [data.user_id, `Updated Semester: ${data.name}`],
        );
      }
      await connection.commit();
      return callBack(null, results);
    } catch (error) {
      if (connection) await connection.rollback();
      return callBack(error);
    } finally {
      connection?.release();
    }
  },

  deleteSemester: (data, callBack) => {
    pool.query(
      "SELECT name FROM semesters WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM semesters WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted Semester: " + result[0].name],
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
