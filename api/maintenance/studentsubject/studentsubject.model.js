const pool = require("../../../db/db");

const TABLE = "academic_records_consolidated";
const academicScopeFilter = `(COALESCE(requesting_admin.admin_academic_scope, 'ALL') = 'ALL'
  OR requesting_admin.admin_academic_scope = (
    SELECT CASE WHEN UPPER(TRIM(scope_schools.code)) = 'SHS' THEN 'SHS' ELSE 'COLLEGE' END
    FROM colleges AS scope_colleges
    INNER JOIN schools AS scope_schools ON scope_schools.id = scope_colleges.school_id
    WHERE scope_colleges.id = departments.college_id
    LIMIT 1
  ))`;

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
      `SELECT STRAIGHT_JOIN arc.school_year_id, sy.name AS school_year,
              arc.semester_id, sem.name AS semester,
              arc.subject_id, subjects.code AS subject_code,
              subjects.name AS subject_name, arc.schedule_code,
              arc.teacher_id,
              record_department.department_id AS teaching_department_id,
              current_department_assignment.teaching_status,
              teaching_departments.code AS teaching_department_code,
              teaching_departments.name AS teaching_department_name,
              teaching_schools.id AS teaching_school_id,
              teaching_schools.code AS teaching_school_code,
              teaching_schools.name AS teaching_school_name,
              student_schools.id AS enrollment_school_id,
              student_schools.code AS enrollment_school_code,
              student_schools.name AS enrollment_school_name,
              CASE WHEN UPPER(TRIM(teaching_schools.code)) = 'SHS' THEN 'SHS' ELSE 'COLLEGE' END AS academic_scope,
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
       INNER JOIN colleges AS student_colleges
         ON student_colleges.id = departments.college_id
       INNER JOIN schools AS student_schools
         ON student_schools.id = student_colleges.school_id
       INNER JOIN academic_record_departments AS record_department
         ON record_department.academic_record_id = arc.id
       INNER JOIN departments AS teaching_departments
         ON teaching_departments.id = record_department.department_id
       INNER JOIN colleges AS teaching_colleges
         ON teaching_colleges.id = teaching_departments.college_id
       INNER JOIN schools AS teaching_schools
         ON teaching_schools.id = teaching_colleges.school_id
       LEFT JOIN teacher_departments AS current_department_assignment
         ON current_department_assignment.teacher_id = arc.teacher_id
        AND current_department_assignment.department_id = record_department.department_id
       INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
       WHERE arc.school_year_id = ? AND arc.semester_id = ?
         AND arc.schedule_code IS NOT NULL AND arc.schedule_code <> ''
         AND (
           COALESCE(requesting_admin.admin_academic_scope, 'ALL') = 'ALL'
           OR requesting_admin.admin_academic_scope = CASE
             WHEN UPPER(TRIM(student_schools.code)) = 'SHS' THEN 'SHS'
             ELSE 'COLLEGE'
           END
         )
       GROUP BY arc.school_year_id, sy.name, arc.semester_id, sem.name,
                arc.subject_id, subjects.code, subjects.name,
                arc.schedule_code, arc.teacher_id, teachers.prefix,
                teachers.givenname, teachers.surname, teachers.suffix,
                record_department.department_id,
                current_department_assignment.teaching_status,
                teaching_departments.code, teaching_departments.name,
                teaching_schools.id, teaching_schools.code, teaching_schools.name,
                student_schools.id, student_schools.code, student_schools.name
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
      const [assignmentSchools] = await connection.query(
        `SELECT DISTINCT
           assigned_college.school_id AS teaching_school_id
         FROM ${TABLE} AS arc
         INNER JOIN user_info ON user_info.user_id = arc.student_id
         INNER JOIN courses ON courses.id = user_info.course_id
         INNER JOIN departments ON departments.id = courses.department_id
         INNER JOIN colleges AS student_colleges
           ON student_colleges.id = departments.college_id
         INNER JOIN academic_record_departments AS record_department
           ON record_department.academic_record_id = arc.id
         INNER JOIN departments AS assigned_department
           ON assigned_department.id = record_department.department_id
         INNER JOIN colleges AS assigned_college
           ON assigned_college.id = assigned_department.college_id
          AND assigned_college.school_id = student_colleges.school_id
         INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
         WHERE arc.school_year_id = ? AND arc.semester_id = ?
           AND arc.subject_id = ? AND arc.teacher_id = ?
           AND arc.schedule_code = ? AND ${academicScopeFilter}`,
        [
          data.user_id,
          data.school_year_id,
          data.semester_id,
          data.subject_id,
          data.current_teacher_id,
          data.schedule_code,
        ],
      );
      if (assignmentSchools.length !== 1) {
        throw new Error(
          "The schedule's school could not be determined.",
        );
      }
      const teachingSchoolId = Number(
        assignmentSchools[0].teaching_school_id,
      );
      if (teachingSchoolId !== Number(data.teaching_school_id)) {
        throw new Error("The schedule's school has changed. Reload the records.");
      }
      const [newRows] = await connection.query(
        `SELECT CONCAT(
           IFNULL(CONCAT(teachers.prefix, ' '), ''), teachers.givenname, ' ', teachers.surname,
           IF(teachers.suffix IS NOT NULL AND teachers.suffix <> '', CONCAT(', ', teachers.suffix), '')
         ) AS name
         FROM teachers
         INNER JOIN teacher_departments
           ON teacher_departments.teacher_id = teachers.id
         INNER JOIN departments AS eligible_departments
           ON eligible_departments.id = teacher_departments.department_id
         INNER JOIN colleges AS eligible_colleges
           ON eligible_colleges.id = eligible_departments.college_id
          AND eligible_colleges.school_id = ?
         WHERE teachers.id = ? AND teachers.is_active = 1 LIMIT 1`,
        [teachingSchoolId, data.teacher_id],
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
        [data.user_id, data.teacher_id,
          data.school_year_id, data.semester_id,
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

  transferScheduleDepartment: async (data, callBack) => {
    let connection;
    try {
      connection = await pool.promise().getConnection();
      await connection.beginTransaction();

      const [currentRows] = await connection.query(
        `SELECT arc.id,
                student_schools.id AS enrollment_school_id,
                student_schools.code AS enrollment_school_code,
                student_schools.name AS enrollment_school_name,
                current_departments.code AS current_department_code,
                current_departments.name AS current_department_name,
                current_schools.code AS current_school_code,
                current_schools.name AS current_school_name,
                CONCAT(
                  IFNULL(CONCAT(teachers.prefix, ' '), ''),
                  teachers.givenname, ' ', teachers.surname,
                  IF(teachers.suffix IS NOT NULL AND teachers.suffix <> '',
                    CONCAT(', ', teachers.suffix), '')
                ) AS teacher_name
         FROM ${TABLE} AS arc
         INNER JOIN teachers ON teachers.id = arc.teacher_id
         INNER JOIN user_info ON user_info.user_id = arc.student_id
         INNER JOIN courses ON courses.id = user_info.course_id
         INNER JOIN departments ON departments.id = courses.department_id
         INNER JOIN colleges AS student_colleges
           ON student_colleges.id = departments.college_id
         INNER JOIN schools AS student_schools
           ON student_schools.id = student_colleges.school_id
         INNER JOIN academic_record_departments AS record_department
           ON record_department.academic_record_id = arc.id
         INNER JOIN departments AS current_departments
           ON current_departments.id = record_department.department_id
         INNER JOIN colleges AS current_colleges
           ON current_colleges.id = current_departments.college_id
         INNER JOIN schools AS current_schools
           ON current_schools.id = current_colleges.school_id
         INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
         WHERE arc.school_year_id = ? AND arc.semester_id = ?
           AND arc.subject_id = ? AND arc.teacher_id = ?
           AND arc.schedule_code = ?
           AND record_department.department_id = ?
           AND ${academicScopeFilter}
         FOR UPDATE`,
        [
          data.user_id,
          data.school_year_id,
          data.semester_id,
          data.subject_id,
          data.current_teacher_id,
          data.schedule_code,
          data.current_department_id,
        ],
      );
      if (!currentRows.length) {
        throw new Error("No matching schedule assignments were found.");
      }

      const enrollmentSchoolIds = new Set(
        currentRows.map((row) => Number(row.enrollment_school_id)),
      );
      if (enrollmentSchoolIds.size !== 1) {
        throw new Error(
          "This schedule contains students from different Schools and cannot be transferred as one assignment.",
        );
      }
      const enrollmentSchoolId = [...enrollmentSchoolIds][0];

      const [targetRows] = await connection.query(
        `SELECT departments.id, departments.code, departments.name,
                schools.id AS school_id, schools.code AS school_code,
                schools.name AS school_name
         FROM departments
         INNER JOIN colleges ON colleges.id = departments.college_id
         INNER JOIN schools ON schools.id = colleges.school_id
         INNER JOIN teacher_departments
           ON teacher_departments.department_id = departments.id
          AND teacher_departments.teacher_id = ?
         WHERE departments.id = ? AND departments.is_active = 1
           AND colleges.is_active = 1 AND schools.is_active = 1
         LIMIT 1`,
        [data.current_teacher_id, data.target_department_id],
      );
      if (!targetRows.length) {
        throw new Error(
          "The assigned teacher is not active in the selected Department.",
        );
      }
      const target = targetRows[0];
      if (Number(target.school_id) !== enrollmentSchoolId) {
        throw new Error(
          "The target Department must belong to the students' School.",
        );
      }
      if (Number(data.current_department_id) === Number(target.id)) {
        throw new Error("The schedule is already assigned to that Department.");
      }

      const [result] = await connection.query(
        `UPDATE academic_record_departments AS record_department
         INNER JOIN ${TABLE} AS arc
           ON arc.id = record_department.academic_record_id
         INNER JOIN user_info ON user_info.user_id = arc.student_id
         INNER JOIN courses ON courses.id = user_info.course_id
         INNER JOIN departments ON departments.id = courses.department_id
         INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
         SET record_department.department_id = ?
         WHERE arc.school_year_id = ? AND arc.semester_id = ?
           AND arc.subject_id = ? AND arc.teacher_id = ?
           AND arc.schedule_code = ?
           AND record_department.department_id = ?
           AND ${academicScopeFilter}`,
        [
          data.user_id,
          target.id,
          data.school_year_id,
          data.semester_id,
          data.subject_id,
          data.current_teacher_id,
          data.schedule_code,
          data.current_department_id,
        ],
      );
      if (!result.affectedRows) {
        throw new Error("No schedule assignments required a transfer.");
      }

      const current = currentRows[0];
      await connection.query(
        "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
        [
          data.user_id,
          `Transferred schedule ${data.schedule_code} for ${current.teacher_name} from ${current.current_department_code} (${current.current_school_code}) to ${target.code} (${target.school_code})`,
        ],
      );
      await connection.commit();
      return callBack(null, {
        enrollments_updated: result.affectedRows,
        school: target.school_name,
        department: target.name,
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
             AND arc.teacher_id = ? AND arc.schedule_code = ? AND arc.is_excluded = 0
             AND ${academicScopeFilter}`,
          [data.user_id, data.school_year_id, data.semester_id, data.subject_id,
            data.teacher_id, data.schedule_code],
        )
        : await connection.query(
          `UPDATE ${TABLE} AS arc
           INNER JOIN user_info ON user_info.user_id = arc.student_id
           INNER JOIN courses ON courses.id = user_info.course_id
           INNER JOIN departments ON departments.id = courses.department_id
           INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
           SET arc.is_excluded = 0, arc.reason = NULL
           WHERE arc.school_year_id = ? AND arc.semester_id = ? AND arc.subject_id = ?
             AND arc.teacher_id = ? AND arc.schedule_code = ? AND arc.reason = 'DISSOLVED'
             AND ${academicScopeFilter}`,
          [data.user_id, data.school_year_id, data.semester_id, data.subject_id,
            data.teacher_id, data.schedule_code],
        );
      if (!result.affectedRows) {
        throw new Error(dissolved
          ? "This schedule is already dissolved."
          : "This schedule is already active.");
      }
      await connection.query(
        "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
        [data.user_id,
          `${dissolved ? "Dissolved" : "Restored"} teacher ${data.teacher_id} assignment for schedule ${data.schedule_code}`],
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
        `SELECT users.username, departments.id AS student_department_id,
                colleges.code AS college_code, schools.id AS student_school_id,
                schools.code AS student_school_code,
                requesting_admin.admin_academic_scope
         FROM users
         INNER JOIN user_info ON user_info.user_id = users.id
         INNER JOIN courses ON courses.id = user_info.course_id
         INNER JOIN departments ON departments.id = courses.department_id
         INNER JOIN colleges ON colleges.id = departments.college_id
         INNER JOIN schools ON schools.id = colleges.school_id
         INNER JOIN users AS requesting_admin ON requesting_admin.id = ?
         WHERE users.id = ? LIMIT 1`,
        [data.user_id, data.student_id],
      );
      const studentUsername = students[0]?.username || "Unknown student";
      const isChsStudent = String(students[0]?.college_code || "").trim().toUpperCase() === "CHS";
      if (!students.length) throw new Error("Student was not found.");
      const [selectedSchools] = await connection.query(
        "SELECT id, code, name FROM schools WHERE id = ? AND is_active = 1 LIMIT 1",
        [data.school_id],
      );
      if (!selectedSchools.length) throw new Error("The selected school is not active or does not exist.");
      const selectedSchool = selectedSchools[0];
      const selectedScope =
        String(selectedSchool.code || "").trim().toUpperCase() === "SHS"
          ? "SHS"
          : "COLLEGE";
      const adminScope = String(
        students[0].admin_academic_scope || "ALL",
      ).toUpperCase();
      if (adminScope !== "ALL" && adminScope !== selectedScope) {
        throw new Error("Your account cannot manage the selected school.");
      }
      if (Number(data.school_id) !== Number(students[0].student_school_id)) {
        throw new Error(
          `This student does not belong to ${selectedSchool.name}.`,
        );
      }
      if (data.use_student_department === true) {
        data.subjects = data.subjects.map((subject) => ({
          ...subject,
          teaching_department_id: students[0].student_department_id,
        }));
      }

      const teacherDepartmentPairs = data.subjects.map((subject) => [
        Number(subject.teacher_id),
        Number(subject.teaching_department_id),
      ]);
      const teacherIds = [...new Set(teacherDepartmentPairs.map(([id]) => id))];
      const departmentIds = [
        ...new Set(teacherDepartmentPairs.map(([, id]) => id)),
      ];
      const [linkedDepartments] = await connection.query(
        `SELECT teacher_departments.teacher_id, teacher_departments.department_id,
                schools.id AS school_id
         FROM teacher_departments
         INNER JOIN departments ON departments.id = teacher_departments.department_id
         INNER JOIN colleges ON colleges.id = departments.college_id
         INNER JOIN schools ON schools.id = colleges.school_id
         WHERE teacher_departments.teacher_id IN (?)
           AND teacher_departments.department_id IN (?)`,
        [teacherIds, departmentIds],
      );
      const validTeacherDepartments = new Set(
        linkedDepartments
          .filter((row) => Number(row.school_id) === Number(data.school_id))
          .map(
            (row) => `${Number(row.teacher_id)}|${Number(row.department_id)}`,
          ),
      );
      if (
        teacherDepartmentPairs.some(
          ([teacherId, departmentId]) =>
            !validTeacherDepartments.has(`${teacherId}|${departmentId}`),
        )
      ) {
        throw new Error(
          "A teacher is not linked to the selected teaching department and school.",
        );
      }
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
          Number(current.teacher_id || 0) !== Number(subject.teacher_id || 0) ||
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

      const recordsByEnrollment = new Map(
        [...existing, ...created].map((record) => [
          enrollmentKey(record),
          record,
        ]),
      );
      const departmentAssignments = data.subjects
        .map((subject) => {
          const record = recordsByEnrollment.get(enrollmentKey(subject));
          return record
            ? [record.id, Number(subject.teaching_department_id)]
            : null;
        })
        .filter(Boolean);
      if (departmentAssignments.length) {
        await connection.query(
          `INSERT INTO academic_record_departments
             (academic_record_id, department_id)
           VALUES ?
           ON DUPLICATE KEY UPDATE department_id = VALUES(department_id)`,
          [departmentAssignments],
        );
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
