const pool = require("../../../db/db");

module.exports = {
  getRooms: (callBack) => {
    pool.query("SELECT * FROM rooms", [], (error, results) => {
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
      return callBack(results[0]);
    });
  },

  addRoom: (data, callBack) => {
    pool.query(
      "INSERT INTO rooms (name, is_active) VALUES (?,?)",
      [data.name, data.is_active],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  updateRoom: (data, callBack) => {
    pool.query(
      "INSERT INTO rooms (name, is_active) VALUES (?,?)",
      [data.name, data.is_active],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
};
