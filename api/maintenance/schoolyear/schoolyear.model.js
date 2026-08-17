const pool = require("../../../db/db");

module.exports = {
  getSchoolYears: (callBack) => {
    pool.query("SELECT * FROM school_years", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getActiveSchoolYears: (callBack) => {
    pool.query(
      "SELECT * FROM school_years WHERE is_active = 1",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getInUseSchoolYear: (callBack) => {
    pool.query(
      `SELECT *
       FROM school_years
       WHERE in_use = 1
       ORDER BY is_active DESC, id DESC`,
      (error, results) => {
        if (error) {
          return callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  getCurrentSchoolYear: (callBack) => {
    pool.query(
      `SELECT *
       FROM school_years
       WHERE in_use = 1 AND is_active = 1
       ORDER BY id DESC
       LIMIT 1`,
      (error, results) => callBack(error, results?.[0]),
    );
  },

  getSchoolYearById: (Id, callBack) => {
    pool.query(
      "SELECT * FROM school_years WHERE id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  getSchoolYearByName: (data, callBack) => {
    pool.query(
      "SELECT * FROM school_years WHERE name LIKE ?",
      [data.school_year],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addSchoolYear: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      const [existing] = await connection.query("SELECT id FROM school_years WHERE name = ?", [data.name]);
      if (existing.length) {
        const error = new Error("School year already exists.");
        error.code = "ER_DUP_ENTRY";
        throw error;
      }
      const isActive = Number(data.is_active) === 1 ? 1 : 0;
      const isInUse = isActive && Number(data.in_use) === 1 ? 1 : 0;
      if (isInUse) await connection.query("UPDATE school_years SET in_use = 0");
      const [results] = await connection.query(
        "INSERT INTO school_years (name, in_use, is_active) VALUES (?,?,?)",
        [data.name, isInUse, isActive],
      );
      await connection.query(
        "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
        [data.user_id, "Added School Year: " + data.name],
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

  updateSchoolYear: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      const isActive = Number(data.is_active) === 1 ? 1 : 0;
      const isInUse = isActive && Number(data.in_use) === 1 ? 1 : 0;
      if (isInUse) await connection.query("UPDATE school_years SET in_use = 0 WHERE id <> ?", [data.id]);
      const [results] = await connection.query(
        "UPDATE school_years SET name = ?, in_use = ?, is_active = ? WHERE id = ?",
        [data.name, isInUse, isActive, data.id],
      );
      if (results.changedRows === 1) {
        await connection.query(
          "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
          [data.user_id, "Updated School Year: " + data.name],
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

  deleteSchoolYear: (data, callBack) => {
    pool.query(
      "SELECT name FROM school_years WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM school_years WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted School Year: " + result[0].name],
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
