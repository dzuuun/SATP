const pool = require("../../../db/db");

const cleanText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const formatTeacherName = (teacher) =>
  `${teacher.prefix ? `${teacher.prefix} ` : ""}${teacher.givenname} ${teacher.surname}${teacher.suffix ? `, ${teacher.suffix}` : ""}`;

const departmentListJoin = `
  LEFT JOIN (
    SELECT teacher_departments.teacher_id,
      GROUP_CONCAT(teacher_departments.department_id
        ORDER BY teacher_departments.is_primary DESC, departments.code) AS department_ids,
      GROUP_CONCAT(departments.code
        ORDER BY teacher_departments.is_primary DESC, departments.code SEPARATOR ', ') AS department_codes,
      GROUP_CONCAT(teacher_departments.teaching_status
        ORDER BY teacher_departments.is_primary DESC, departments.code) AS department_teaching_statuses,
      GROUP_CONCAT(colleges.school_id
        ORDER BY teacher_departments.is_primary DESC, departments.code) AS department_school_ids,
      MAX(CASE WHEN teacher_departments.is_primary = 1
        THEN teacher_departments.teaching_status END) AS primary_teaching_status
    FROM teacher_departments
    INNER JOIN departments ON departments.id = teacher_departments.department_id
    INNER JOIN colleges ON colleges.id = departments.college_id
    GROUP BY teacher_departments.teacher_id
  ) AS linked_departments ON linked_departments.teacher_id = teachers.id`;

function normalizedDepartmentAssignments(data) {
  const supplied = Array.isArray(data.department_assignments)
    ? data.department_assignments
    : [];
  const fallbackIds = Array.isArray(data.department_ids)
    ? data.department_ids
    : String(data.department_ids || "").split(",");
  const assignments = supplied.length
    ? supplied
    : [data.department_id, ...fallbackIds].map((departmentId) => ({
        department_id: departmentId,
        teaching_status: data.is_part_time,
      }));
  const byDepartment = new Map();
  assignments.forEach((assignment) => {
    const departmentId = Number(assignment.department_id);
    const teachingStatus = Number(assignment.teaching_status);
    if (
      Number.isInteger(departmentId) &&
      departmentId > 0 &&
      [0, 1, 2].includes(teachingStatus)
    ) {
      byDepartment.set(departmentId, {
        department_id: departmentId,
        teaching_status: teachingStatus,
      });
    }
  });
  const primaryDepartmentId = Number(data.department_id);
  if (!byDepartment.has(primaryDepartmentId)) {
    byDepartment.set(primaryDepartmentId, {
      department_id: primaryDepartmentId,
      teaching_status: Number(data.is_part_time),
    });
  }
  return [...byDepartment.values()];
}

function syncTeacherDepartments(teacherId, data, callBack) {
  const assignments = normalizedDepartmentAssignments(data);
  if (!assignments.length) {
    return callBack(new Error("At least one teacher department is required."));
  }
  pool.query(
    `SELECT department_id, is_primary, teaching_status
     FROM teacher_departments
     WHERE teacher_id = ?
     ORDER BY department_id`,
    [teacherId],
    (selectError, currentRows) => {
      if (selectError) return callBack(selectError);
      const rows = assignments.map((assignment) => [
        teacherId,
        assignment.department_id,
        assignment.department_id === Number(data.department_id) ? 1 : 0,
        assignment.teaching_status,
      ]);
      const current = currentRows
        .map(
          (row) =>
            `${Number(row.department_id)}:${Number(row.is_primary)}:${Number(row.teaching_status)}`,
        )
        .sort()
        .join("|");
      const expected = rows
        .map(
          ([, departmentId, isPrimary, teachingStatus]) =>
            `${departmentId}:${isPrimary}:${teachingStatus}`,
        )
        .sort()
        .join("|");
      if (current === expected) return callBack(null, { changedRows: 0 });
      return pool.query(
        "DELETE FROM teacher_departments WHERE teacher_id = ?",
        [teacherId],
        (deleteError) => {
          if (deleteError) return callBack(deleteError);
          return pool.query(
            `INSERT INTO teacher_departments
              (teacher_id, department_id, is_primary, teaching_status) VALUES ?`,
            [rows],
            (insertError) =>
              callBack(insertError, insertError ? undefined : { changedRows: 1 }),
          );
        },
      );
    },
  );
}

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
          COALESCE(linked_departments.department_codes, departments.code) AS department_code,
          COALESCE(linked_departments.department_codes, departments.code) AS department_codes,
          COALESCE(linked_departments.department_ids, teachers.department_id) AS department_ids,
          linked_departments.department_teaching_statuses,
          linked_departments.department_school_ids,
          teachers.department_id,
          linked_departments.primary_teaching_status AS is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      ${departmentListJoin}
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
          COALESCE(linked_departments.department_codes, departments.code) AS department_code,
          COALESCE(linked_departments.department_codes, departments.code) AS department_codes,
          COALESCE(linked_departments.department_ids, teachers.department_id) AS department_ids,
          linked_departments.department_teaching_statuses,
          linked_departments.department_school_ids,
          teachers.department_id,
          linked_departments.primary_teaching_status AS is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      ${departmentListJoin}
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
          COALESCE(linked_departments.department_ids, teachers.department_id) AS department_ids,
          COALESCE(linked_departments.department_codes, departments.code) AS department_codes,
          linked_departments.department_teaching_statuses,
          linked_departments.department_school_ids,
          linked_departments.primary_teaching_status AS is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      ${departmentListJoin}
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
          COALESCE(linked_departments.department_ids, teachers.department_id) AS department_ids,
          COALESCE(linked_departments.department_codes, departments.code) AS department_codes,
          linked_departments.department_teaching_statuses,
          linked_departments.department_school_ids,
          linked_departments.primary_teaching_status AS is_part_time,
          teachers.is_active
      FROM teachers
      INNER JOIN departments
        ON teachers.department_id = departments.id
      ${departmentListJoin}
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
            (prefix, surname, givenname, middlename, suffix, department_id, is_active)
           VALUES (?,?,?,?,?,?,?)`,
          [
            prefix,
            surname,
            givenname,
            middlename,
            suffix,
            data.department_id,
            data.is_active,
          ],
          (insertError, insertResults) => {
            if (insertError) {
              return callBack(insertError);
            }

            syncTeacherDepartments(insertResults.insertId, data, (syncError) => {
              if (syncError) return callBack(syncError);
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
            });
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
         is_active=?
       WHERE id=?`,
      [
        prefix,
        surname,
        givenname,
        middlename,
        suffix,
        data.department_id,
        data.is_active,
        data.id,
      ],
      (error, results) => {
        if (error) {
          return callBack(error);
        }

        syncTeacherDepartments(data.id, data, (syncError, syncResults) => {
          if (syncError) return callBack(syncError);
        results.changedRows = Math.max(
          Number(results.changedRows || 0),
          Number(syncResults?.changedRows || 0),
        );
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
        });
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

        // Preserve the department represented by each original teacher record
        // before any academic record is moved to the retained teacher.
        await connection.query(
          `INSERT IGNORE INTO academic_record_departments
             (academic_record_id, department_id)
           SELECT arc.id, teachers.department_id
           FROM academic_records_consolidated AS arc
           INNER JOIN teachers ON teachers.id = arc.teacher_id
           WHERE arc.teacher_id IN (?, ?)
             AND teachers.department_id IS NOT NULL`,
          [duplicateTeacherId, retainedTeacherId],
        );

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
            await connection.query(
              `UPDATE academic_record_departments AS retained_department
               INNER JOIN academic_record_departments AS duplicate_department
                 ON duplicate_department.academic_record_id = ?
               SET retained_department.department_id = duplicate_department.department_id
               WHERE retained_department.academic_record_id = ?`,
              [record.duplicate_record_id, record.retained_record_id],
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
        await connection.query(
          `INSERT IGNORE INTO teacher_departments
            (teacher_id, department_id, is_primary, teaching_status)
           SELECT ?, department_id, 0, teaching_status
           FROM teacher_departments
           WHERE teacher_id = ?`,
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
