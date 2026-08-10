const pool = require("../../../db/db");

const TABLE = "academic_records_consolidated";

const recordSelect = `
  SELECT
    records.id,
    records.student_id,
    records.school_year_id,
    records.semester_id,
    records.subject_id,
    records.teacher_id,
    records.room_id,
    users.username AS student_number,
    CONCAT_WS(' ', user_info.givenname, user_info.surname) AS student_name,
    school_years.name AS school_year,
    semesters.name AS semester,
    subjects.code AS subject_code,
    subjects.name AS subject_name,
    CONCAT_WS(' ', teachers.givenname, teachers.surname) AS teacher_name,
    records.schedule_code,
    records.time_start,
    records.time_end,
    records.day,
    rooms.name AS room,
    records.is_excluded,
    records.reason,
    records.comment,
    records.status
  FROM ${TABLE} AS records
  INNER JOIN school_years ON school_years.id = records.school_year_id
  INNER JOIN semesters ON semesters.id = records.semester_id
  INNER JOIN subjects ON subjects.id = records.subject_id
  INNER JOIN teachers ON teachers.id = records.teacher_id
  INNER JOIN user_info ON user_info.user_id = records.student_id
  INNER JOIN users ON users.id = records.student_id
  LEFT JOIN rooms ON rooms.id = records.room_id
`;

const insertSql = `
  INSERT INTO ${TABLE}
    (school_year_id, semester_id, subject_id, teacher_id, student_id,
     schedule_code, time_start, time_end, day, room_id, is_excluded, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
`;

function logActivity(userId, action) {
  if (!userId) return;
  pool.query(
    `INSERT INTO activity_log (user_id, date_time, action)
     VALUES (?, CURRENT_TIMESTAMP, ?)`,
    [userId, action],
    (error) => {
      if (error) console.error("Unable to write activity log:", error.message);
    },
  );
}

function describeRecord(id, callBack) {
  pool.query(`${recordSelect} WHERE records.id = ? LIMIT 1`, [id], callBack);
}

function insertValues(data) {
  return [
    data.school_year_id,
    data.semester_id,
    data.subject_id,
    data.teacher_id,
    data.student_id,
    data.schedule_code || null,
    data.time_start || null,
    data.time_end || null,
    data.day || null,
    data.room_id || null,
    Number(data.is_excluded) === 1 ? 1 : 0,
  ];
}

function activityDescription(record) {
  return `${record.school_year} | ${record.semester} | ${record.subject_code} | ${record.teacher_name}`;
}

module.exports = {
  getActiveScheduleAssignments: (data, callBack) => {
    pool.query(
      `SELECT arc.school_year_id, sy.name AS school_year,
              arc.semester_id, sem.name AS semester,
              arc.subject_id, subjects.code AS subject_code,
              subjects.name AS subject_name, arc.schedule_code,
              arc.teacher_id,
              CONCAT(
                IFNULL(CONCAT(teachers.prefix, ' '), ''),
                teachers.givenname, ' ', teachers.surname,
                IF(
                  teachers.suffix IS NOT NULL AND teachers.suffix <> '',
                  CONCAT(', ', teachers.suffix),
                  ''
                )
              ) AS teacher_name,
              COUNT(DISTINCT arc.student_id) AS student_count
       FROM ${TABLE} AS arc
       INNER JOIN school_years AS sy ON sy.id = arc.school_year_id
       INNER JOIN semesters AS sem ON sem.id = arc.semester_id
       INNER JOIN subjects ON subjects.id = arc.subject_id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       WHERE arc.school_year_id = ? AND arc.semester_id = ?
         AND arc.schedule_code IS NOT NULL AND TRIM(arc.schedule_code) <> ''
       GROUP BY arc.school_year_id, sy.name, arc.semester_id, sem.name,
                arc.subject_id, subjects.code, subjects.name,
                arc.schedule_code, arc.teacher_id, teachers.prefix,
                teachers.givenname, teachers.surname, teachers.suffix
       ORDER BY arc.schedule_code, subjects.code, teacher_name`,
      [data.school_year_id, data.semester_id],
      callBack,
    );
  },

  reassignScheduleTeacher: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      const [currentRows] = await connection.query(
        `SELECT CONCAT(
           IFNULL(CONCAT(prefix, ' '), ''), givenname, ' ', surname,
           IF(suffix IS NOT NULL AND suffix <> '', CONCAT(', ', suffix), '')
         ) AS name
         FROM teachers WHERE id = ? LIMIT 1`,
        [data.current_teacher_id],
      );
      const [newRows] = await connection.query(
        `SELECT CONCAT(
           IFNULL(CONCAT(prefix, ' '), ''), givenname, ' ', surname,
           IF(suffix IS NOT NULL AND suffix <> '', CONCAT(', ', suffix), '')
         ) AS name
         FROM teachers WHERE id = ? AND is_active = 1 LIMIT 1`,
        [data.teacher_id],
      );
      if (!newRows.length) throw new Error("The selected teacher is unavailable.");

      const [transactionResult] = await connection.query(
        `UPDATE transactions AS transactions
         INNER JOIN ${TABLE} AS arc
           ON arc.student_id = transactions.user_id
          AND arc.school_year_id = transactions.school_year_id
          AND arc.semester_id = transactions.semester_id
          AND arc.subject_id = transactions.subject_id
         SET transactions.teacher_id = ?
         WHERE arc.school_year_id = ? AND arc.semester_id = ?
           AND arc.subject_id = ? AND arc.teacher_id = ?
           AND arc.schedule_code = ?`,
        [data.teacher_id, data.school_year_id, data.semester_id, data.subject_id,
          data.current_teacher_id, data.schedule_code],
      );
      const [enrollmentResult] = await connection.query(
        `UPDATE ${TABLE} SET teacher_id = ?
         WHERE school_year_id = ? AND semester_id = ? AND subject_id = ?
           AND teacher_id = ? AND schedule_code = ?`,
        [data.teacher_id, data.school_year_id, data.semester_id, data.subject_id,
          data.current_teacher_id, data.schedule_code],
      );
      if (!enrollmentResult.affectedRows) {
        throw new Error("No matching section assignments were found.");
      }
      await connection.query(
        "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
        [data.user_id,
          `Reassigned schedule ${data.schedule_code} from ${currentRows[0]?.name || "Unknown teacher"} to ${newRows[0].name}`],
      );
      await connection.commit();
      return callBack(null, {
        enrollments_updated: enrollmentResult.affectedRows,
        transactions_updated: transactionResult.affectedRows,
      });
    } catch (error) {
      if (connection) await connection.rollback();
      return callBack(error);
    } finally {
      if (connection) connection.release();
    }
  },

  getStudentsByPeriod: (data, callBack) => {
    pool.query(
      `SELECT
         records.student_id,
         users.username AS student_number,
         CONCAT_WS(' ', user_info.givenname, user_info.surname) AS student_name,
         colleges.code AS college,
         courses.code AS course,
         SUM(CASE WHEN records.is_excluded = 0 THEN 1 ELSE 0 END) AS included_count,
         SUM(CASE WHEN records.is_excluded = 1 THEN 1 ELSE 0 END) AS excluded_count,
         COUNT(*) AS total_count
       FROM ${TABLE} AS records
       INNER JOIN users ON users.id = records.student_id
       INNER JOIN user_info ON user_info.user_id = records.student_id
       INNER JOIN courses ON courses.id = user_info.course_id
       INNER JOIN departments ON departments.id = courses.department_id
       INNER JOIN colleges ON colleges.id = departments.college_id
       WHERE records.school_year_id = ? AND records.semester_id = ?
       GROUP BY records.student_id, users.username, user_info.givenname,
         user_info.surname, colleges.code, courses.code
       ORDER BY user_info.surname, user_info.givenname`,
      [data.school_year_id, data.semester_id],
      callBack,
    );
  },

  getSubjectsByPeriod: (data, callBack) => {
    pool.query(
      `${recordSelect}
       WHERE records.school_year_id = ? AND records.semester_id = ?
       ORDER BY user_info.surname, user_info.givenname, subjects.code`,
      [data.school_year_id, data.semester_id],
      callBack,
    );
  },

  getIncludedSubjectsByStudent: (data, callBack) => {
    pool.query(
      `${recordSelect}
       WHERE records.student_id = ? AND records.school_year_id = ?
         AND records.semester_id = ? AND records.is_excluded = 0
       ORDER BY subjects.code`,
      [data.student_id, data.school_year_id, data.semester_id],
      callBack,
    );
  },

  getIncludedSubjectsByStudentById: describeRecord,

  getAllSubjectsByStudent: (data, callBack) => {
    pool.query(
      `${recordSelect}
       WHERE records.student_id = ? AND records.school_year_id = ?
         AND records.semester_id = ? AND records.is_excluded = 1
       ORDER BY subjects.code`,
      [data.student_id, data.school_year_id, data.semester_id],
      callBack,
    );
  },

  showReason: (data, callBack) => {
    pool.query(
      `SELECT reason FROM ${TABLE} WHERE id = ? LIMIT 1`,
      [data.id],
      callBack,
    );
  },

  addStudentSubject: (data, callBack) => {
    pool.query(
      `SELECT id FROM ${TABLE}
       WHERE student_id = ? AND school_year_id = ? AND semester_id = ?
         AND subject_id = ?
       LIMIT 1`,
      [data.student_id, data.school_year_id, data.semester_id, data.subject_id],
      (error, existing) => {
        if (error) return callBack(error);
        if (existing.length) {
          const duplicateError = new Error("Student subject already exists");
          duplicateError.code = "DUPLICATE_SUBJECT";
          return callBack(duplicateError);
        }

        pool.query(insertSql, insertValues(data), (insertError, results) => {
          if (insertError) return callBack(insertError);
          describeRecord(results.insertId, (describeError, records) => {
            if (!describeError && records[0]) {
              logActivity(
                data.user_id,
                `Added student's subject: ${activityDescription(records[0])}`,
              );
            }
          });
          return callBack(null, results);
        });
      },
    );
  },

  addStudentSubjects: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();

      const [students] = await connection.query(
        "SELECT username FROM users WHERE id = ? LIMIT 1",
        [data.student_id],
      );
      const studentUsername = students[0]?.username || "Unknown student";

      const subjectIds = data.subjects.map((subject) =>
        Number(subject.subject_id),
      );
      const placeholders = subjectIds.map(() => "?").join(",");
      const [existing] = await connection.query(
        `SELECT id, subject_id, teacher_id, schedule_code, time_start, time_end,
                day, room_id, is_excluded
         FROM ${TABLE}
         WHERE student_id = ? AND school_year_id = ? AND semester_id = ?
           AND subject_id IN (${placeholders})`,
        [data.student_id, data.school_year_id, data.semester_id, ...subjectIds],
      );
      const existingBySubject = new Map(
        existing.map((record) => [Number(record.subject_id), record]),
      );
      const pendingSubjects = data.subjects.filter(
        (subject) => !existingBySubject.has(Number(subject.subject_id)),
      );
      const comparable = (value) =>
        String(value ?? "")
          .trim()
          .replace(/\s+/g, " ")
          .toLowerCase();
      const comparableTime = (value) => {
        const normalized = comparable(value);
        const match = normalized.match(/^(\d{1,2}):(\d{2})/);
        return match
          ? `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`
          : normalized;
      };
      const updated = [];
      const skipped = [];

      for (const subject of data.subjects) {
        const current = existingBySubject.get(Number(subject.subject_id));
        if (!current) continue;
        const changed =
          Number(current.teacher_id) !== Number(subject.teacher_id) ||
          comparable(current.schedule_code) !== comparable(subject.schedule_code) ||
          comparableTime(current.time_start) !== comparableTime(subject.time_start) ||
          comparableTime(current.time_end) !== comparableTime(subject.time_end) ||
          comparable(current.day) !== comparable(subject.day) ||
          Number(current.room_id || 0) !== Number(subject.room_id || 0) ||
          Number(current.is_excluded || 0) !== Number(subject.is_excluded || 0);

        if (!changed) {
          skipped.push({ id: current.id, subject_id: current.subject_id });
          continue;
        }
        await connection.query(
          `UPDATE ${TABLE}
           SET teacher_id = ?, schedule_code = ?, time_start = ?, time_end = ?,
               day = ?, room_id = ?, is_excluded = ?
           WHERE id = ?`,
          [
            subject.teacher_id,
            subject.schedule_code || null,
            subject.time_start || null,
            subject.time_end || null,
            subject.day || null,
            subject.room_id || null,
            subject.is_excluded ? 1 : 0,
            current.id,
          ],
        );
        updated.push({ id: current.id, subject_id: current.subject_id });
      }
      let created = [];

      if (pendingSubjects.length) {
        const values = pendingSubjects.map((subject) =>
          insertValues({ ...data, ...subject }),
        );
        await connection.query(
          `INSERT INTO ${TABLE}
            (school_year_id, semester_id, subject_id, teacher_id, student_id,
             schedule_code, time_start, time_end, day, room_id, is_excluded,
             status)
           VALUES ?`,
          [values.map((value) => [...value, 0])],
        );

        const createdSubjectIds = pendingSubjects.map((subject) =>
          Number(subject.subject_id),
        );
        const createdPlaceholders = createdSubjectIds.map(() => "?").join(",");
        const [createdRows] = await connection.query(
          `SELECT id, subject_id
           FROM ${TABLE}
           WHERE student_id = ? AND school_year_id = ? AND semester_id = ?
             AND subject_id IN (${createdPlaceholders})`,
          [
            data.student_id,
            data.school_year_id,
            data.semester_id,
            ...createdSubjectIds,
          ],
        );
        created = createdRows;
      }

      await connection.commit();
      connection.release();
      connection = null;

      if (created.length) {
        logActivity(
          data.user_id,
          `Added ${created.length} student subject${created.length === 1 ? "" : "s"} for student ${studentUsername}`,
        );
      }
      if (updated.length) {
        logActivity(
          data.user_id,
          `Updated ${updated.length} student subject${updated.length === 1 ? "" : "s"} for student ${studentUsername}`,
        );
      }
      return callBack(null, { created, updated, skipped });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } finally {
          connection.release();
        }
      }
      return callBack(error);
    }
  },

  updateStudentSubject: (data, callBack) => {
    pool.query(
      `SELECT id FROM ${TABLE}
       WHERE student_id = ? AND school_year_id = ? AND semester_id = ?
         AND subject_id = ? AND id <> ?
       LIMIT 1`,
      [
        data.student_id,
        data.school_year_id,
        data.semester_id,
        data.subject_id,
        data.id,
      ],
      (lookupError, existing) => {
        if (lookupError) return callBack(lookupError);
        if (existing.length) {
          const duplicateError = new Error("Student subject already exists");
          duplicateError.code = "DUPLICATE_SUBJECT";
          return callBack(duplicateError);
        }

        pool.query(
          `UPDATE ${TABLE}
           SET subject_id = ?, teacher_id = ?, schedule_code = ?,
             time_start = ?, time_end = ?, day = ?, room_id = ?
           WHERE id = ?`,
          [
            data.subject_id,
            data.teacher_id,
            data.schedule_code || null,
            data.time_start || null,
            data.time_end || null,
            data.day || null,
            data.room_id || null,
            data.id,
          ],
          (updateError, results) => {
            if (updateError) return callBack(updateError);
            if (results.changedRows === 1) {
              logActivity(
                data.user_id,
                `Updated student subject record ID ${data.id}`,
              );
            }
            return callBack(null, results);
          },
        );
      },
    );
  },

  deactivateStudentSubject: (data, callBack) => {
    pool.query(
      `UPDATE ${TABLE}
       SET is_excluded = 1, reason = ?
       WHERE id = ? AND is_excluded = 0`,
      [data.reason, data.id],
      (error, results) => {
        if (error || results.changedRows !== 1) {
          return callBack(error, results);
        }
        describeRecord(data.id, (describeError, records) => {
          if (!describeError && records[0]) {
            logActivity(
              data.user_id,
              `Excluded student's subject: ${activityDescription(records[0])}`,
            );
          }
        });
        return callBack(null, results);
      },
    );
  },
};
