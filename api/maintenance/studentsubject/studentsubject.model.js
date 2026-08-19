const pool = require("../../../db/db");

const TABLE = "academic_records_consolidated";
const academicScopeFilter = `(COALESCE(requesting_admin.admin_academic_scope, 'ALL') = 'ALL'
  OR (requesting_admin.admin_academic_scope = 'SHS' AND UPPER(TRIM(departments.code)) = 'SHS')
  OR (requesting_admin.admin_academic_scope = 'COLLEGE' AND UPPER(TRIM(departments.code)) <> 'SHS'))`;

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
    CONCAT(
      IFNULL(CONCAT(NULLIF(TRIM(teachers.prefix), ''), ' '), ''),
      teachers.givenname, ' ', teachers.surname,
      IF(
        teachers.suffix IS NOT NULL AND TRIM(teachers.suffix) <> '',
        CONCAT(', ', TRIM(teachers.suffix)),
        ''
      )
    ) AS teacher_name,
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
  INNER JOIN courses ON courses.id = user_info.course_id
  INNER JOIN departments ON departments.id = courses.department_id
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

function describeScopedRecord(data, callBack) {
  pool.query(
    `${recordSelect}
     INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
     WHERE records.id = ? AND ${academicScopeFilter} LIMIT 1`,
    [data.requesting_user_id, data.id],
    callBack,
  );
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
              COUNT(DISTINCT arc.student_id) AS student_count,
              MIN(arc.is_excluded) AS is_excluded,
              SUM(arc.reason = 'DISSOLVED') AS dissolved_count
       FROM ${TABLE} AS arc
       INNER JOIN school_years AS sy ON sy.id = arc.school_year_id
       INNER JOIN semesters AS sem ON sem.id = arc.semester_id
       INNER JOIN subjects ON subjects.id = arc.subject_id
       INNER JOIN teachers ON teachers.id = arc.teacher_id
       INNER JOIN user_info ON user_info.user_id = arc.student_id
       INNER JOIN courses ON courses.id = user_info.course_id
       INNER JOIN departments ON departments.id = courses.department_id
       INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
       WHERE arc.school_year_id = ? AND arc.semester_id = ?
         AND arc.schedule_code IS NOT NULL AND TRIM(arc.schedule_code) <> ''
         AND ${academicScopeFilter}
       GROUP BY arc.school_year_id, sy.name, arc.semester_id, sem.name,
                arc.subject_id, subjects.code, subjects.name,
                arc.schedule_code, arc.teacher_id, teachers.prefix,
                teachers.givenname, teachers.surname, teachers.suffix
       ORDER BY arc.schedule_code, subjects.code, teacher_name`,
      [data.requesting_user_id, data.school_year_id, data.semester_id],
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

      const [enrollmentResult] = await connection.query(
        `UPDATE ${TABLE} AS arc
         INNER JOIN user_info ON user_info.user_id = arc.student_id
         INNER JOIN courses ON courses.id = user_info.course_id
         INNER JOIN departments ON departments.id = courses.department_id
         INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
         SET arc.teacher_id = ?
         WHERE arc.school_year_id = ? AND arc.semester_id = ?
           AND arc.subject_id = ? AND arc.teacher_id = ?
           AND arc.schedule_code = ? AND ${academicScopeFilter}`,
        [data.user_id, data.teacher_id, data.school_year_id, data.semester_id,
          data.subject_id, data.current_teacher_id, data.schedule_code],
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
      });
    } catch (error) {
      if (connection) await connection.rollback();
      return callBack(error);
    } finally {
      if (connection) connection.release();
    }
  },

  setScheduleDissolved: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();
      const dissolved = data.dissolved === true;
      const [result] = dissolved
        ? await connection.query(
          `UPDATE ${TABLE} AS arc
           INNER JOIN user_info ON user_info.user_id = arc.student_id
           INNER JOIN courses ON courses.id = user_info.course_id
           INNER JOIN departments ON departments.id = courses.department_id
           INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
           SET arc.is_excluded = 1, arc.reason = 'DISSOLVED'
           WHERE arc.school_year_id = ? AND arc.semester_id = ? AND arc.subject_id = ?
             AND arc.schedule_code = ? AND arc.is_excluded = 0
             AND ${academicScopeFilter}`,
          [data.user_id, data.school_year_id, data.semester_id, data.subject_id, data.schedule_code],
        )
        : await connection.query(
          `UPDATE ${TABLE} AS arc
           INNER JOIN user_info ON user_info.user_id = arc.student_id
           INNER JOIN courses ON courses.id = user_info.course_id
           INNER JOIN departments ON departments.id = courses.department_id
           INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
           SET arc.is_excluded = 0, arc.reason = NULL
           WHERE arc.school_year_id = ? AND arc.semester_id = ? AND arc.subject_id = ?
             AND arc.schedule_code = ? AND arc.reason = 'DISSOLVED'
             AND ${academicScopeFilter}`,
          [data.user_id, data.school_year_id, data.semester_id, data.subject_id, data.schedule_code],
        );
      if (!result.affectedRows) {
        throw new Error(dissolved
          ? "This schedule is already dissolved."
          : "This schedule is already active.");
      }
      await connection.query(
        "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
        [data.user_id,
          `${dissolved ? "Dissolved" : "Restored"} schedule ${data.schedule_code}`],
      );
      await connection.commit();
      return callBack(null, { enrollments_updated: result.affectedRows });
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
         records.included_count,
         records.excluded_count,
         records.included_count AS total_count
       FROM (
         SELECT
           student_id,
           SUM(is_excluded = 0) AS included_count,
           SUM(is_excluded = 1) AS excluded_count
         FROM ${TABLE}
         WHERE school_year_id = ? AND semester_id = ?
         GROUP BY student_id
       ) AS records
       INNER JOIN users ON users.id = records.student_id
       INNER JOIN user_info ON user_info.user_id = records.student_id
       INNER JOIN courses ON courses.id = user_info.course_id
       INNER JOIN departments ON departments.id = courses.department_id
       INNER JOIN colleges ON colleges.id = departments.college_id
       INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
       WHERE ${academicScopeFilter}
       ORDER BY user_info.surname, user_info.givenname`,
      [data.school_year_id, data.semester_id, data.requesting_user_id],
      callBack,
    );
  },

  getSubjectsByPeriod: (data, callBack) => {
    pool.query(
      `${recordSelect}
       INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
       WHERE records.school_year_id = ? AND records.semester_id = ?
         AND ${academicScopeFilter}
       ORDER BY user_info.surname, user_info.givenname, subjects.code`,
      [data.requesting_user_id, data.school_year_id, data.semester_id],
      callBack,
    );
  },

  getIncludedSubjectsByStudent: (data, callBack) => {
    pool.query(
      `${recordSelect}
       INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
       WHERE records.student_id = ? AND records.school_year_id = ?
         AND records.semester_id = ? AND records.is_excluded = 0
         AND ${academicScopeFilter}
       ORDER BY subjects.code`,
      [
        data.requesting_user_id,
        data.student_id,
        data.school_year_id,
        data.semester_id,
      ],
      callBack,
    );
  },

  getIncludedSubjectsByStudentById: describeScopedRecord,

  getAllSubjectsByStudent: (data, callBack) => {
    pool.query(
      `${recordSelect}
       INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
       WHERE records.student_id = ? AND records.school_year_id = ?
         AND records.semester_id = ? AND records.is_excluded = 1
         AND ${academicScopeFilter}
       ORDER BY subjects.code`,
      [
        data.requesting_user_id,
        data.student_id,
        data.school_year_id,
        data.semester_id,
      ],
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
      `SELECT records.id FROM ${TABLE} AS records
       INNER JOIN user_info ON user_info.user_id = records.student_id
       INNER JOIN courses ON courses.id = user_info.course_id
       INNER JOIN departments ON departments.id = courses.department_id
       INNER JOIN colleges ON colleges.id = departments.college_id
       WHERE records.student_id = ? AND records.school_year_id = ?
         AND records.semester_id = ? AND records.subject_id = ?
         AND (UPPER(TRIM(colleges.code)) <> 'CHS' OR
           (records.teacher_id = ? AND COALESCE(TRIM(records.schedule_code), '') = ?))
       LIMIT 1`,
      [data.student_id, data.school_year_id, data.semester_id, data.subject_id,
        data.teacher_id, String(data.schedule_code || "").trim()],
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
        `SELECT users.username, colleges.code AS college_code
         FROM users
         INNER JOIN user_info ON user_info.user_id = users.id
         INNER JOIN courses ON courses.id = user_info.course_id
         INNER JOIN departments ON departments.id = courses.department_id
         INNER JOIN colleges ON colleges.id = departments.college_id
         WHERE users.id = ? LIMIT 1`,
        [data.student_id],
      );
      const studentUsername = students[0]?.username || "Unknown student";
      const isChsStudent = String(students[0]?.college_code || "").trim().toUpperCase() === "CHS";

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
      const enrollmentKey = (record) => isChsStudent
        ? [Number(record.subject_id), String(record.schedule_code || "").trim().toLowerCase(),
          Number(record.teacher_id)].join("|")
        : String(Number(record.subject_id));
      const submittedKeys = new Set(data.subjects.map(enrollmentKey));
      if (submittedKeys.size !== data.subjects.length) {
        throw new Error(isChsStudent
          ? "The submitted course, schedule, and teacher list contains duplicates."
          : "The submitted course list contains duplicates.");
      }
      const existingByEnrollment = new Map(
        existing.map((record) => [enrollmentKey(record), record]),
      );
      const pendingSubjects = data.subjects.filter(
        (subject) => !existingByEnrollment.has(enrollmentKey(subject)),
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
        const current = existingByEnrollment.get(enrollmentKey(subject));
        if (!current) continue;
        const changed =
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

        const createdSubjectIds = [...new Set(pendingSubjects.map((subject) =>
          Number(subject.subject_id),
        ))];
        const createdPlaceholders = createdSubjectIds.map(() => "?").join(",");
        const [createdRows] = await connection.query(
          `SELECT id, subject_id, teacher_id, schedule_code
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
        const pendingKeys = new Set(pendingSubjects.map(enrollmentKey));
        created = createdRows.filter((record) => pendingKeys.has(enrollmentKey(record)));
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
      `SELECT records.id FROM ${TABLE} AS records
       INNER JOIN user_info ON user_info.user_id = records.student_id
       INNER JOIN courses ON courses.id = user_info.course_id
       INNER JOIN departments ON departments.id = courses.department_id
       INNER JOIN colleges ON colleges.id = departments.college_id
       WHERE records.student_id = ? AND records.school_year_id = ?
         AND records.semester_id = ? AND records.subject_id = ?
         AND (UPPER(TRIM(colleges.code)) <> 'CHS' OR
           (records.teacher_id = ? AND COALESCE(TRIM(records.schedule_code), '') = ?))
         AND records.id <> ?
       LIMIT 1`,
      [
        data.student_id,
        data.school_year_id,
        data.semester_id,
        data.subject_id,
        data.teacher_id,
        String(data.schedule_code || "").trim(),
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
          const record = !describeError && records[0] ? records[0] : null;
          if (record) {
            logActivity(
              data.user_id,
              `Excluded student course for ${record.student_number}: ${record.subject_code} | ${record.schedule_code || "No schedule code"} | ${record.teacher_name}`,
            );
          }
          return callBack(null, { ...results, record });
        });
      },
    );
  },

  restoreStudentSubject: (data, callBack) => {
    pool.query(
      `UPDATE ${TABLE}
       SET is_excluded = 0, reason = NULL
       WHERE id = ? AND is_excluded = 1`,
      [data.id],
      (error, results) => {
        if (error || results.changedRows !== 1) {
          return callBack(error, results);
        }
        describeRecord(data.id, (describeError, records) => {
          const record = !describeError && records[0] ? records[0] : null;
          if (record) {
            logActivity(
              data.user_id,
              `Restored student course for ${record.student_number}: ${record.subject_code} | ${record.schedule_code || "No schedule code"} | ${record.teacher_name}`,
            );
          }
          return callBack(null, { ...results, record });
        });
      },
    );
  },
};
