const pool = require("../../../db/db");

module.exports = {
  getAllCategory: (callBack) => {
    pool.query("SELECT * FROM categories", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getCategoryById: (Id, callBack) => {
    pool.query(
      "SELECT * FROM categories WHERE id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addCategory: (data, callBack) => {
    pool.query(
      "SELECT name FROM categories WHERE name=?",
      [data.name],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO categories (name, is_active) VALUES (?,?)",
            [data.name, data.is_active],
            (error, results) => {
              console.log(error);
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added Category: " + data.name],
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

  updateCategory: (data, callBack) => {
    pool.query(
      "UPDATE categories SET name=?, is_active=? WHERE id=?",
      [data.name, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
            [data.user_id, "Updated Category: " + data.name],
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

  deleteCategory: (data, callBack) => {
    pool.query(
      "SELECT name FROM categories WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM categories WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted Category: " + result[0].name],
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

  SearchCategory: (data, callBack) => {
    pool.query(
      "SELECT * FROM categories WHERE name LIKE '%" +
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
