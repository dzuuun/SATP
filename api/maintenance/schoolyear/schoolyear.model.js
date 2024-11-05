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
      "SELECT * FROM school_years WHERE in_use = 1",
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
      "SELECT * FROM school_years WHERE in_use = 1",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
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

  addSchoolYear: (data, callBack) => {
    pool.query(
      "SELECT name FROM school_years WHERE name=?",
      [data.name],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO school_years (name, in_use, is_active) VALUES (?,?,?)",
            [data.name, data.in_use, data.is_active],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added School Year: " + data.name],
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

  updateSchoolYear: (data, callBack) => {
    pool.query(
      "UPDATE school_years SET name = ?, in_use = ?, is_active = ? WHERE id = ?",
      [data.name, data.in_use, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated School Year: " + data.name],
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
