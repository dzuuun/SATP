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
    pool.query("SELECT * FROM semesters WHERE in_use = 1", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
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

  addSemester: (data, callBack) => {
    pool.query(
      "SELECT name FROM semesters WHERE name=?",
      [data.name],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO semesters (name, in_use, is_active) VALUES (?,?,?)",
            [data.name, data.in_use, data.is_active],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added Semester: " + data.name],
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

  updateSemester: (data, callBack) => {
    pool.query(
      "UPDATE semesters SET name = ?, in_use = ?, is_active = ? WHERE id = ?",
      [data.name, data.in_use, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated Semester: " + data.name],
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
