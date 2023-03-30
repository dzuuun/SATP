const pool = require("../../../db/db");

module.exports = {
  getLog: (callBack) => {
    pool.query(
      "SELECT DATE_FORMAT(activity_log.date_time, '%M %d, %Y %r') AS date_time, CONCAT( user_info.givenname, ' ', user_info.surname ) AS name, activity_log.action FROM activity_log INNER JOIN user_info ON activity_log.user_id = user_info.user_id",
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  searchLogs: (data, callBack) => {
    pool.query(
      "SELECT DATE_FORMAT( activity_log.date_time, '%M %d, %Y %r' ) AS date_time, CONCAT( user_info.givenname, ' ', user_info.surname ) AS NAME, activity_log.action FROM activity_log INNER JOIN user_info ON activity_log.user_id = user_info.user_id WHERE user_info.givenname LIKE '%" +
        data.search +
        "%' OR user_info.middlename LIKE '%" +
        data.search +
        "%' OR user_info.surname LIKE '%" +
        data.search +
        "%' OR activity_log.date_time LIKE '%" +
        data.search +
        "%' OR activity_log.action LIKE '%" +
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
