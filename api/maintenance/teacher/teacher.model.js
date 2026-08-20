const pool = require("../../../db/db");

const cleanText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const formatTeacherName = (teacher) =>
  `${teacher.prefix ? `${teacher.prefix} ` : ""}${teacher.givenname} ${teacher.surname}${teacher.suffix ? `, ${teacher.suffix}` : ""}`;

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
            `SELECT prefix, givenname, surname, suffix
             FROM teachers
             WHERE id = ?`,
            [data.id],
            (teacherError, teacherResults) => {
              if (teacherError) {
                console.log(teacherError);
                return;
              }

              const teacher = teacherResults[0];
              if (!teacher) return;

              const teacherName =
                (teacher.prefix ? `${teacher.prefix} ` : "") +
                `${teacher.givenname} ${teacher.surname}` +
                (teacher.suffix ? `, ${teacher.suffix}` : "");

              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  `Activated teacher ${teacherName} during subject import`,
                ],
                (logError) => {
                  if (logError) console.log(logError);
                },
              );
            },
          );
        }

        return callBack(null, results);
      },
    );
  },

  mergeTeacher: (data, callBack) => {
    const duplicateTeacherId = Number(data.duplicate_teacher_id);
    const retainedTeacherId = Number(data.retained_teacher_id);

    if (
      !Number.isInteger(duplicateTeacherId) ||
      duplicateTeacherId < 1 ||
      !Number.isInteger(retainedTeacherId) ||
      retainedTeacherId < 1 ||
      duplicateTeacherId === retainedTeacherId
    ) {
      const error = new Error(
        "Select two different, valid teacher records to merge.",
      );
      error.statusCode = 400;
      return callBack(error);
    }

    (async () => {
      const connection = await pool.promise().getConnection();
      try {
        await connection.beginTransaction();

        const [teachers] = await connection.query(
          `SELECT id, prefix, givenname, surname, suffix, is_active
           FROM teachers
           WHERE id IN (?, ?)
           FOR UPDATE`,
          [duplicateTeacherId, retainedTeacherId],
        );
        const duplicateTeacher = teachers.find(
          (teacher) => Number(teacher.id) === duplicateTeacherId,
        );
        const retainedTeacher = teachers.find(
          (teacher) => Number(teacher.id) === retainedTeacherId,
        );
        if (!duplicateTeacher || !retainedTeacher) {
          const error = new Error("One of the selected teachers no longer exists.");
          error.statusCode = 404;
          throw error;
        }

        const [[scheduleCount]] = await connection.query(
          `SELECT COUNT(*) AS total
           FROM academic_records_consolidated
           WHERE teacher_id = ?`,
          [duplicateTeacherId],
        );

        const [overlappingRecords] = await connection.query(
          `SELECT
             duplicate_record.id AS duplicate_record_id,
             duplicate_record.status AS duplicate_status,
             duplicate_record.comment AS duplicate_comment,
             duplicate_record.is_excluded AS duplicate_is_excluded,
             duplicate_record.reason AS duplicate_reason,
             retained_record.id AS retained_record_id,
             retained_record.status AS retained_status
           FROM academic_records_consolidated AS duplicate_record
           INNER JOIN academic_records_consolidated AS retained_record
             ON retained_record.student_id = duplicate_record.student_id
            AND retained_record.school_year_id = duplicate_record.school_year_id
            AND retained_record.semester_id = duplicate_record.semester_id
            AND retained_record.subject_id = duplicate_record.subject_id
            AND retained_record.schedule_code <=> duplicate_record.schedule_code
            AND retained_record.teacher_id = ?
           WHERE duplicate_record.teacher_id = ?
           FOR UPDATE`,
          [retainedTeacherId, duplicateTeacherId],
        );

        let ratingsTransferred = 0;
        for (const record of overlappingRecords) {
          const duplicateIsRated = Number(record.duplicate_status) !== 0;
          const retainedIsRated = Number(record.retained_status) !== 0;
          if (duplicateIsRated && !retainedIsRated) {
            await connection.query(
              "DELETE FROM trans_item WHERE transaction_id = ?",
              [record.retained_record_id],
            );
            await connection.query(
              "UPDATE trans_item SET transaction_id = ? WHERE transaction_id = ?",
              [record.retained_record_id, record.duplicate_record_id],
            );
            await connection.query(
              `UPDATE academic_records_consolidated
               SET status = ?, comment = ?, is_excluded = ?, reason = ?
               WHERE id = ?`,
              [
                record.duplicate_status,
                record.duplicate_comment,
                record.duplicate_is_excluded,
                record.duplicate_reason,
                record.retained_record_id,
              ],
            );
            ratingsTransferred += 1;
          }

          await connection.query(
            "DELETE FROM academic_records_consolidated WHERE id = ?",
            [record.duplicate_record_id],
          );
        }

        await connection.query(
          `UPDATE academic_records_consolidated
           SET teacher_id = ?
           WHERE teacher_id = ?`,
          [retainedTeacherId, duplicateTeacherId],
        );

        await connection.query(
          `DELETE duplicate_record
           FROM student_subject AS duplicate_record
           INNER JOIN student_subject AS retained_record
             ON retained_record.school_year_id = duplicate_record.school_year_id
            AND retained_record.semester_id = duplicate_record.semester_id
            AND retained_record.subject_id = duplicate_record.subject_id
            AND retained_record.student_id = duplicate_record.student_id
            AND retained_record.schedule_code = duplicate_record.schedule_code
            AND retained_record.teacher_id = ?
           WHERE duplicate_record.teacher_id = ?`,
          [retainedTeacherId, duplicateTeacherId],
        );
        await connection.query(
          "UPDATE student_subject SET teacher_id = ? WHERE teacher_id = ?",
          [retainedTeacherId, duplicateTeacherId],
        );
        await connection.query(
          "UPDATE transactions SET teacher_id = ? WHERE teacher_id = ?",
          [retainedTeacherId, duplicateTeacherId],
        );
        await connection.query(
          "UPDATE image_file SET teacher_id = ? WHERE teacher_id = ?",
          [retainedTeacherId, duplicateTeacherId],
        );

        if (Number(duplicateTeacher.is_active) === 1) {
          await connection.query(
            "UPDATE teachers SET is_active = 1 WHERE id = ?",
            [retainedTeacherId],
          );
        }
        await connection.query("DELETE FROM teachers WHERE id = ?", [
          duplicateTeacherId,
        ]);

        const duplicateName = formatTeacherName(duplicateTeacher);
        const retainedName = formatTeacherName(retainedTeacher);
        await connection.query(
          `INSERT INTO activity_log (user_id, date_time, action)
           VALUES (?, CURRENT_TIMESTAMP, ?)`,
          [
            data.user_id,
            `Merged duplicate teacher ${duplicateName} into ${retainedName}; transferred ${Number(scheduleCount.total)} student course record(s)`,
          ],
        );

        await connection.commit();
        return {
          duplicateTeacher: duplicateName,
          retainedTeacher: retainedName,
          schedulesTransferred: Number(scheduleCount.total),
          ratingsTransferred,
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })().then((result) => callBack(null, result), callBack);
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
