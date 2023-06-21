const pool = require("../../../db/db");

module.exports = {
  getPermissions: (callBack) => {
    pool.query("SELECT * FROM permissions", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },

  getActivePermissions: (callBack) => {
    pool.query("SELECT * FROM permissions WHERE is_active = 1 ORDER BY permissions.name", (error, results) => {
      if (error) {
        callBack(error);
      }
      return callBack(null, results);
    });
  },


  getPermissionById: (Id, callBack) => {
    pool.query(
      "SELECT * FROM permissions WHERE id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  addPermission: (data, callBack) => {
    pool.query(
      "SELECT name FROM permissions WHERE name=?",
      [data.name],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO permissions( name, transaction_access, maintenance_access, reports_access, users_access, is_active ) VALUES(?,?,?,?,?,?)",
            [
              data.name,
              data.transaction_access,
              data.maintenance_access,
              data.reports_access,
              data.users_access,
              data.is_active,
            ],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Added Permission: " + data.name],
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

  updatePermission: (data, callBack) => {
    pool.query(
      "UPDATE permissions SET  name=?, transaction_access=?, maintenance_access=?, reports_access=?, users_access=?, is_active=? WHERE id=?",
      [
        data.name,
        data.transaction_access,
        data.maintenance_access,
        data.reports_access,
        data.users_access,
        data.is_active,
        data.id,
      ],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [data.user_id, "Updated Permission: " + data.name],
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

  deletePermission: (data, callBack) => {
    pool.query(
      "SELECT name FROM permissions WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM permissions WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [data.user_id, "Deleted Permission: " + result[0].name],
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

  searchPermissions: (data, callBack) => {
    pool.query(
      "SELECT * FROM permissions WHERE name LIKE '%" + data.search + "%'",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },
};
