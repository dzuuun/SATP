const pool = require("../../../db/db");

module.exports = {
  getTransactions: (callBack) => {
    pool.query(
      "   SELECT transactions.id, transactions.user_id, transactions.status, users.username,  CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, subjects.code AS subject_code, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teachers_name  FROM transactions INNER JOIN users ON transactions.user_id = users.id INNER JOIN user_info ON users.id=user_info.user_id INNER JOIN subjects ON transactions.subject_id=subjects.id INNER JOIN teachers ON transactions.teacher_id=teachers.id",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
  getRatingsByTransactionId: (Id, callBack) => {
    pool.query(
      "SELECT transactions.id, items.number, categories.name, items.question, trans_item.rate FROM trans_item INNER JOIN transactions ON trans_item.transaction_id=transactions.id INNER JOIN items ON trans_item.item_id=items.id INNER JOIN categories ON items.category_id=categories.id WHERE trans_item.transaction_id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  getCommentByTransactionId: (Id, callBack) => {
    pool.query(
      "SELECT comment FROM transactions WHERE id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  addTransaction: (data, callBack) => {
    pool.query(
      "SELECT id FROM transactions WHERE school_year_id=? AND semester_id=? AND subject_id=? AND teacher_id=? AND user_id=?",
      [
        data.school_year_id,
        data.semester_id,
        data.subject_id,
        data.teacher_id,
        data.id,
      ],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO transactions(school_year_id, semester_id, subject_id, teacher_id, user_id) VALUES (?,?,?,?,?)",
            [
              data.school_year_id,
              data.semester_id,
              data.subject_id,
              data.teacher_id,
              data.id,
            ],
            (error, result) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added Transaction: "],
                (error, results) => {
                  if (error) {
                    console.log(error);
                  }
                }
              );
              if (error) {
                callBack(error);
              }
              return callBack(null, result);
            }
          );
        } else {
          return callBack(results);
        }
      }
    );
  },
};
