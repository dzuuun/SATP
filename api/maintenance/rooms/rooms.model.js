const pool = require("../../../db/db");

module.exports = {
  getRooms: (callBack) => {
    pool.query("SELECT * FROM rooms", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getRoomById: (Id, callBack) => {
    pool.query("SELECT * FROM rooms WHERE id = ?", [Id], (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results[0]);
    });
  },

  addRoom: (data, callBack) => {
    pool.query(
      "SELECT name FROM rooms WHERE name=?",
      [data.name],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO rooms (name, is_active) VALUES (?,?)",
            [data.name, data.is_active],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added Room: " + data.name],
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

  updateRoom: (data, callBack) => {
    pool.query(
      "UPDATE rooms SET name=?, is_active=? WHERE id = ?",
      [data.name, data.is_active, data.id],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated Room: " + data.name],
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

  searchRooms: (data, callBack) => {
    pool.query(
      "SELECT * FROM rooms WHERE name LIKE '%" +
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

  deleteRoom: (data, callBack) => {
    pool.query(
      "SELECT name FROM rooms WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM rooms WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted Room: " + result[0].name],
                (error, results) => {
                  if (error) {
                    console.log(error);
                  }
                  console.log("Action added to Activity Log.");
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