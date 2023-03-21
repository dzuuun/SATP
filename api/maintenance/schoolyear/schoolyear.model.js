const pool = require("../../../db/db");

module.exports = {
  getSchoolYears: (callBack) => {
    pool.query("SELECT * FROM school_years", [], (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getSchoolYearById: (Id, callBack) => {
    pool.query(
      "SELECT * FROM school_years WHERE id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(results[0]);
      }
    );
  },

  addSchoolYear: (data, callBack) => {
    pool.query(
      "INSERT INTO school_years (name, in_use, is_active) VALUES (?,?,?)",
      [data.name, data.in_use, data.is_active],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  updateSchoolYear: (data, callBack) => {
    pool.query(
      "UPDATE school_years SET name = ?, in_use = ?, is_active = ? WHERE id = ?",
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
