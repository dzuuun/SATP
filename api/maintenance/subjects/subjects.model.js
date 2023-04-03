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

  addSubject: (data, callBack) => {
    pool.query(
      "SELECT code FROM subjects WHERE code=?",
      [data.code],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO subjects (code, name, is_active) VALUES (?,?,?)",
            [data.code, data.name, data.is_active],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added Subject: " + data.code],
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

  updateSubject: (data, callBack) => {
    pool.query(
      "UPDATE subjects SET code=?, name=?, is_active=? WHERE id=?",
      [data.code, data.name, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated Subject: " + data.name],
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

  searchSubjects: (data, callBack) => {
    pool.query(
      "SELECT * FROM subjects WHERE code LIKE '%" +
        data.search +
        "%'  OR name LIKE '%" +
        data.search +
        "%' OR is_active LIKE '%" +
        data.search +
        "%'",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
};
