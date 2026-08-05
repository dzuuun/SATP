const pool = require("../../../db/db");

const cleanText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

module.exports = {
  getTeachers: (callback) => {
    pool.query(
      `SELECT
          teachers.id,
          teachers.prefix,
          teachers.givenname,
          teachers.surname,
          teachers.middlename,
          teachers.suffix,
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
          teachers.department_id,
          teachers.is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      ORDER BY teachers.surname, teachers.givenname`,
      (error, results) => {
        if (error) {
          return callback(error);
        }
        return callback(null, results);
      },
    );
  },

  getActiveTeachers: (callback) => {
    pool.query(
      `SELECT
          teachers.id,
          teachers.prefix,
          teachers.givenname,
          teachers.surname,
          teachers.middlename,
          teachers.suffix,
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
          teachers.department_id,
          teachers.is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      WHERE teachers.is_active = 1
      ORDER BY teachers.surname, teachers.givenname`,
      (error, results) => {
        if (error) {
          return callback(error);
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
          return callBack(error);
        }
        return callBack(null, results[0]);
      },
    );
  },

  getTeacherByName: (data, callBack) => {
    const givenname = cleanText(data.givenname);
    const surname = cleanText(data.surname);

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
      WHERE LOWER(TRIM(teachers.givenname)) LIKE LOWER(?)
        AND LOWER(TRIM(teachers.surname)) LIKE LOWER(?)
      ORDER BY teachers.surname, teachers.givenname
      LIMIT 1`,
      [givenname + "%", surname + "%"],
      (error, results) => {
        if (error) {
          return callBack(error);
        }
        return callBack(null, results[0]);
      },
    );
  },

  addTeacher: (data, callBack) => {
    const prefix = cleanText(data.prefix) || null;
    const surname = cleanText(data.surname);
    const givenname = cleanText(data.givenname);
    const middlename = cleanText(data.middlename) || null;
    const suffix = cleanText(data.suffix) || null;

    pool.query(
      `SELECT id
       FROM teachers
       WHERE LOWER(TRIM(surname)) = LOWER(?)
         AND LOWER(TRIM(givenname)) = LOWER(?)
       LIMIT 1`,
      [surname, givenname],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        if (results.length > 0) {
          return callBack(null, {
            duplicate: true,
            existingId: results[0].id,
            affectedRows: 0,
          });
        }

        pool.query(
          `INSERT INTO teachers
            (prefix, surname, givenname, middlename, suffix, department_id, is_part_time, is_active)
           VALUES (?,?,?,?,?,?,?,?)`,
          [
            prefix,
            surname,
            givenname,
            middlename,
            suffix,
            data.department_id,
            data.is_part_time,
            data.is_active,
          ],
          (insertError, insertResults) => {
            if (insertError) {
              return callBack(insertError);
            }

            pool.query(
              "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
              [
                data.user_id,
                "Added Teacher: " +
                  (prefix ? prefix + " " : "") +
                  givenname +
                  " " +
                  surname +
                  (suffix ? ", " + suffix : ""),
              ],
              (logError) => {
                if (logError) console.log(logError);
              },
            );

            return callBack(null, insertResults);
          },
        );
      },
    );
  },

  updateTeacher: (data, callBack) => {
    const prefix = cleanText(data.prefix) || null;
    const surname = cleanText(data.surname);
    const givenname = cleanText(data.givenname);
    const middlename = cleanText(data.middlename) || null;
    const suffix = cleanText(data.suffix) || null;

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
        prefix,
        surname,
        givenname,
        middlename,
        suffix,
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
                (prefix ? prefix + " " : "") +
                givenname +
                " " +
                surname +
                (suffix ? ", " + suffix : ""),
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

        if (!result.length) {
          return callBack(null, { affectedRows: 0 });
        }

        pool.query(
          "DELETE FROM teachers WHERE id=?",
          [data.id],
          (deleteError, results) => {
            if (deleteError) {
              return callBack(deleteError);
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
