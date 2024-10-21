const pool = require("../../../db/db");

module.exports = {
  getSubjects: (callBack) => {
    pool.query("SELECT * FROM subjects", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getActiveSubjects: (callBack) => {
    pool.query(
      "SELECT * FROM subjects WHERE is_active = 1",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getSubjectById: (Id, callBack) => {
    pool.query(
      "SELECT * FROM subjects WHERE id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  getSubjectByCode: (data, callBack) => {
    pool.query(
      "     SELECT * FROM subjects WHERE code LIKE ?",
      [data.subject_code],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addSubject: (data, callBack) => {
    pool.query(
      "SELECT code FROM subjects WHERE code = ?",
      [data.code],
      (error, results) => {
        if (error) {
          return callBack(error); // Return early on error
        }

        if (results.length === 0) {
          // No subject found, proceed with insert
          pool.query(
            "INSERT INTO subjects (code, name, is_active) VALUES (?, ?, ?)",
            [data.code, data.name, data.is_active],
            (error, results) => {
              if (error) {
                return callBack(error); // Return early on error
              }

              // Log activity after successful subject insert
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
                [data.user_id, "Added Subject: " + data.code],
                (error) => {
                  if (error) {
                    console.log("Activity Log Error:", error); // Log the error but don't interrupt flow
                  }
                }
              );

              return callBack(null, results); // Success callback
            }
          );
        } else {
          return callBack(null, results); // Subject already exists, send results back
        }
      }
    );
  },
  
  updateSubject: (data, callBack) => {
    pool.query(
      "UPDATE subjects SET code = ?, name = ?, is_active = ? WHERE id = ?",
      [data.code, data.name, data.is_active, data.id],
      (error, results) => {
        if (error) {
          return callBack(error); // Return early on error
        }

        if (results.changedRows === 1) {
          // Log the activity if the subject was successfully updated
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
            [data.user_id, "Updated Subject: " + data.name],
            (logError) => {
              if (logError) {
                console.log("Activity Log Error:", logError); // Log the error but don't interrupt the flow
              }
            }
          );
        }
        return callBack(null, results); // Success callback
      }
    );
  },

  deleteSubject: (data, callBack) => {
    pool.query(
      "SELECT code FROM subjects WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM subjects WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted Subject: " + result[0].code],
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
