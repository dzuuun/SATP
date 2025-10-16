const pool = require("../../../db/db");

module.exports = {
  getAllItems: (callBack) => {
    pool.query(
"SELECT * FROM gradschool_items ORDER BY number",
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
      "SELECT * FROM gradschool_items WHERE is_active = 1 ORDER BY number",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getActiveStarRatingItems: (callBack) => {
    pool.query(
      "SELECT * FROM gradschool_items WHERE is_active = 1 AND star_rating=1 ORDER BY number",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
  getActiveCommentsItems: (callBack) => {
    pool.query(
      "SELECT * FROM gradschool_items WHERE is_active = 1 AND star_rating=0 ORDER BY number",
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
"SELECT * FROM gradschool_items WHERE id=? ORDER BY number",      [Id],
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
      "SELECT number FROM gradschool_items WHERE number=?",
      [data.number],
      (error, results) => {
        if (results.length == 0) {
          pool.query(
            "INSERT INTO gradschool_items (number, question, star_rating, is_active) VALUES (?,?,?,?)",
            [data.number, data.question, data.star_rating, data.is_active],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Added Grad School Item: " + data.number + ". " + data.question,
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
      "UPDATE gradschool_items SET number=?, question=?, star_rating=?, is_active=? WHERE id=?",
      [data.number, data.question, data.star_rating, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [
              data.user_id,
              "Updated Grad School Item: " + data.number + ". " + data.question,
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
  
  submitComment: (data, callBack) => {
    console.log(data)
    pool.query(
      "SELECT * FROM gradschool_comments WHERE transaction_id = ? AND gradschool_item_id = ?",
      [data.transaction_id, data.gradschool_item_id],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO gradschool_comments(transaction_id, gradschool_item_id, comment) VALUES (?,?,?)",
            [data.transaction_id, data.gradschool_item_id, data.comment],
            (error, results) => {
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

};
