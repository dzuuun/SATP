const pool = require("../../../db/db");

module.exports = {
  getTransactions: (callBack) => {
    pool.query("SELECT * FROM transactions", (error, results) => {
      if (error) {
        callBack(error);
      }
      for (var i = 0; i < results.length; i++) {
        console.log(results[i].id);
      }
      return callBack(null, results);
    });
  },

  addTransaction: (data, callBack) => {
    pool.query(
      "SELECT id FROM transactions WHERE school_year_id=? AND semester_id=? AND subject_id=? AND teacher_id=? AND user_id=?",
      [
        data.school_year_id,
        data.semester_id,
        data.subject_id,
        data.teacher_id,
        data.user_id,
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
              data.user_id,
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


