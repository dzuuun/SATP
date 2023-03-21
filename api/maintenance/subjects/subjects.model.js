const pool = require("../../../db/db");

module.exports = {
  getSubjects: (callBack) => {
    pool.query("SELECT * FROM subjects", [], (error, results) => {
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
        return callBack(results[0]);
      }
    );
  },

  addSubject: (data, callBack) => {
    pool.query(
      "INSERT INTO subjects (code, name, is_active) VALUES (?,?,?)",
      [data.code, data.name, data.is_active],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(results);
      }
    );
  },

  updateSubject: (data, callBack) => {
    pool.query(
      "UPDATE subjects SET code=?, name=?, is_active=? WHERE id=?",
      [data.name, data.in_use, data.is_active, data.id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  }
};
