const pool = require("../../../db/db");

module.exports = {
  getTeachers: (callback) => {
    pool.query(
      `SELECT
          teachers.id,
          CONCAT(
            IFNULL(CONCAT(teachers.prefix, ' '), ''),
            teachers.givenname,
            ' ',
            teachers.surname,
            IF(
              teachers.suffix IS NOT NULL AND teachers.suffix <> '',
              CONCAT(', ', teachers.suffix),
              ''
            )
          ) AS name,
          departments.code AS department_code,
          teachers.is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      ORDER BY teachers.surname, teachers.givenname`,
      (error, results) => {
        if (error) {
          callback(error);
        }
        return callback(null, results);
      },
    );
  },

  getActiveTeachers: (callback) => {
    pool.query(
      `SELECT
          teachers.id,
          CONCAT(
            IFNULL(CONCAT(teachers.prefix, ' '), ''),
            teachers.givenname,
            ' ',
            teachers.surname,
            IF(
              teachers.suffix IS NOT NULL AND teachers.suffix <> '',
              CONCAT(', ', teachers.suffix),
              ''
            )
          ) AS name,
          departments.code AS department_code,
          teachers.is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      WHERE teachers.is_active = 1
      ORDER BY teachers.surname, teachers.givenname`,
      (error, results) => {
        if (error) {
          callback(error);
        }
        return callback(null, results);
      },
    );
  },

  getTeacherById: (Id, callBack) => {
    pool.query(
      `SELECT
          teachers.id,
          teachers.prefix,
          teachers.givenname,
          teachers.surname,
          teachers.middlename,
          teachers.suffix,
          departments.id AS department_id,
          teachers.is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      WHERE teachers.id=?`,
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      },
    );
  },

  getTeacherByName: (data, callBack) => {
    pool.query(
      `SELECT
          teachers.id,
          teachers.prefix,
          teachers.givenname,
          teachers.surname,
          teachers.middlename,
          teachers.suffix,
          departments.id AS department_id,
          teachers.is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      WHERE teachers.givenname LIKE ? AND teachers.surname LIKE ?`,
      [data.givenname + "%", data.surname + "%"],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      },
    );
  },

  addTeacher: (data, callBack) => {
    pool.query(
      "SELECT surname, givenname FROM teachers WHERE surname=? AND givenname=?",
      [data.surname, data.givenname],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        if (results.length === 0) {
          pool.query(
            `INSERT INTO teachers
              (prefix, surname, givenname, middlename, suffix, department_id, is_part_time, is_active)
             VALUES (?,?,?,?,?,?,?,?)`,
            [
              data.prefix,
              data.surname,
              data.givenname,
              data.middlename,
              data.suffix,
              data.department_id,
              data.is_part_time,
              data.is_active,
            ],
            (error, results) => {
              if (error) {
                return callBack(error);
              }

              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Added Teacher: " +
                    (data.prefix ? data.prefix + " " : "") +
                    data.givenname +
                    " " +
                    data.surname +
                    (data.suffix ? ", " + data.suffix : ""),
                ],
                (logError) => {
                  if (logError) console.log(logError);
                },
              );

              return callBack(null, results);
            },
          );
        } else {
          return callBack(results);
        }
      },
    );
  },

  updateTeacher: (data, callBack) => {
    pool.query(
      `UPDATE teachers
       SET
         prefix=?,
         surname=?,
         givenname=?,
         middlename=?,
         suffix=?,
         department_id=?,
         is_part_time=?,
         is_active=?
       WHERE id=?`,
      [
        data.prefix,
        data.surname,
        data.givenname,
        data.middlename,
        data.suffix,
        data.department_id,
        data.is_part_time,
        data.is_active,
        data.id,
      ],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        if (results.changedRows === 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [
              data.user_id,
              "Updated Teacher: " +
                (data.prefix ? data.prefix + " " : "") +
                data.givenname +
                " " +
                data.surname +
                (data.suffix ? ", " + data.suffix : ""),
            ],
            (logError) => {
              if (logError) console.log(logError);
            },
          );
        }

        return callBack(null, results);
      },
    );
  },

  activateTeacher: (data, callBack) => {
    pool.query(
      "UPDATE teachers SET is_active=1 WHERE id=? AND is_active<>1",
      [data.id],
      (error, results) => {
        if (error) return callBack(error);

        if (results.changedRows === 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [
              data.user_id,
              `Activated teacher ID ${data.id} during subject import`,
            ],
            (logError) => {
              if (logError) console.log(logError);
            },
          );
        }

        return callBack(null, results);
      },
    );
  },

  deleteTeacher: (data, callBack) => {
    pool.query(
      "SELECT prefix, givenname, surname, suffix FROM teachers WHERE id=?",
      [data.id],
      (error, result) => {
        if (error) {
          return callBack(error);
        }

        pool.query(
          "DELETE FROM teachers WHERE id=?",
          [data.id],
          (error, results) => {
            if (error) {
              return callBack(error);
            }

            if (results.affectedRows === 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Deleted Teacher: " +
                    (result[0].prefix ? result[0].prefix + " " : "") +
                    result[0].givenname +
                    " " +
                    result[0].surname +
                    (result[0].suffix ? ", " + result[0].suffix : ""),
                ],
                (logError) => {
                  if (logError) console.log(logError);
                },
              );
            }

            return callBack(null, results);
          },
        );
      },
    );
  },
};