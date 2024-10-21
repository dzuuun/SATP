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

  getActiveRooms: (callBack) => {
    pool.query("SELECT * FROM rooms WHERE is_active = 1", (error, results) => {
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

  getRoomByCode: (data, callBack) => {
    pool.query(
      "SELECT * FROM rooms WHERE name LIKE ?",
      [data.room_name],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },
  addRoom: (data, callBack) => {
    pool.query(
      "SELECT name FROM rooms WHERE name = ?",
      [data.name],
      (error, results) => {
        if (error) {
          return callBack(error); // Return early on error
        }
  
        if (results.length === 0) {
          pool.query(
            "INSERT INTO rooms (name, is_active) VALUES (?, ?)",
            [data.name, data.is_active],
            (error, results) => {
              if (error) {
                return callBack(error); // Return early on error
              }
  
              // Log activity after successful room insert
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
                [data.user_id, "Added Room: " + data.name],
                (logError) => {
                  if (logError) {
                    console.log("Activity Log Error:", logError); // Log the error but don't interrupt flow
                  }
                }
              );
  
              return callBack(null, results); // Success callback
            }
          );
        } else {
          return callBack(null, results); // Room already exists, send results back
        }
      }
    );
  },
  
  updateRoom: (data, callBack) => {
    pool.query(
      "UPDATE rooms SET name = ?, is_active = ? WHERE id = ?",
      [data.name, data.is_active, data.id],
      (error, results) => {
        if (error) {
          return callBack(error); // Return early on error
        }
  
        if (results.changedRows === 1) {
          // Log activity after successful room update
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
            [data.user_id, "Updated Room: " + data.name],
            (logError) => {
              if (logError) {
                console.log("Activity Log Error:", logError); // Log the error but don't interrupt flow
              }
            }
          );
        }
  
        return callBack(null, results); // Success callback
      }
    );
  },
  

  // deleteRoom: (data, callBack) => {
  //   pool.query(
  //     "SELECT name FROM rooms WHERE id=?",
  //     [data.id],
  //     (error, result) => {
  //       pool.query(
  //         "DELETE FROM rooms WHERE id=?",
  //         [data.id],
  //         (error, results) => {
  //           if (results.affectedRows == 1) {
  //             pool.query(
  //               "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
  //               [data.user_id, "Deleted Room: " + result[0].name],
  //               (error, results) => {
  //                 if (error) {
  //                   console.log(error);
  //                 }
  //               }
  //             );
  //           }
  //           if (error) {
  //             callBack(error);
  //           }
  //           return callBack(null, results);
  //         }
  //       );
  //       if (error) {
  //         return callBack(error);
  //       }
  //     }
  //   );
  // },
};
