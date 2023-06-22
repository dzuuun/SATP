const pool = require("../../../db/db");

module.exports = {
  getAllItems: (callBack) => {
    pool.query(
      "SELECT items.id, items.number, categories.name AS category, items.question, items.is_active FROM items INNER JOIN categories ON items.category_id = categories.id ORDER BY categories.id, items.number",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getActiveItems: (callBack) => {
    pool.query(
      "SELECT items.id, items.number, categories.name AS category, items.question, items.is_active FROM items INNER JOIN categories ON items.category_id = categories.id WHERE items.is_active = 1 AND categories.is_active = 1 ORDER BY categories.id, items.number",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getItemById: (Id, callBack) => {
    pool.query(
      "SELECT items.id, items.number, categories.id AS category_id, categories.name AS category, items.question, items.is_active FROM items INNER JOIN categories ON items.category_id = categories.id WHERE items.id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addItem: (data, callBack) => {
    pool.query(
      "SELECT number, category_id FROM items WHERE number=? AND category_id=?",
      [data.number, data.category_id],
      (error, results) => {
        if (results.length == 0) {
          pool.query(
            "INSERT INTO items (number, question, category_id, is_active) VALUES (?,?,?,?)",
            [data.number, data.question, data.category_id, data.is_active],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Added Item: " + data.number + ". " + data.question,
                ],
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

  updateItem: (data, callBack) => {
    pool.query(
      "UPDATE items SET number=?, question=?, category_id=?, is_active=? WHERE id=?",
      [data.number, data.question, data.category_id, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [
              data.user_id,
              "Updated Item: " + data.number + ". " + data.question,
            ],
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

  deleteItem: (data, callBack) => {
    pool.query(
      "SELECT items.number, categories.name AS category, items.question FROM items INNER JOIN categories ON items.category_id = categories.id WHERE items.id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM items WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Deleted on Category: " +
                    result[0].category +
                    " Item #" +
                    result[0].number +
                    ". " +
                    result[0].question,
                ],
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
