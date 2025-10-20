const pool = require("../../../db/db");

module.exports = {
  getLog: (start, length, search, callBack) => {
  const params = [];
  let filter = "";
  
  if (search) {
    filter = "WHERE CONCAT(u.givenname, ' ', u.surname) LIKE ? OR a.action LIKE ?";
    params.push(`%${search}%`, `%${search}%`);
  }

  const countQuery = `SELECT COUNT(*) AS total FROM activity_log a INNER JOIN user_info u ON a.user_id = u.user_id ${filter}`;
  const dataQuery = `
    SELECT DATE_FORMAT(a.date_time, '%M %d, %Y %r') AS date_time,
           CONCAT(u.givenname, ' ', u.surname) AS name,
           a.action
    FROM activity_log a
    INNER JOIN user_info u ON a.user_id = u.user_id
    ${filter}
    ORDER BY a.date_time DESC
    LIMIT ?, ?
  `;

  const dataParams = [...params, start, length];

  pool.query(countQuery, params, (err, countResult) => {
    if (err) return callBack(err);
    const totalFiltered = countResult[0].total;

    pool.query(dataQuery, dataParams, (err, results) => {
      if (err) return callBack(err);
      callBack(null, {
        totalRecords: totalFiltered,   // if you want, you can query total without filter for recordsTotal
        totalFiltered,
        results
      });
    });
  });
}
};