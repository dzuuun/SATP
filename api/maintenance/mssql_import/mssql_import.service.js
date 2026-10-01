const sql = require("mssql");
const { createHash } = require("node:crypto");
const mysql = require("../../../db/db");

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
const value = (row, ...names) => {
  const fields = Object.keys(row).reduce((map, key) => {
    map.set(normalize(key).replace(/[ _-]/g, ""), row[key]);
    return map;
  }, new Map());
  for (const name of names) {
    const found = fields.get(normalize(name).replace(/[ _-]/g, ""));
    if (found !== undefined && found !== null) return String(found).trim();
  }
  return "";
};
const positive = (item) => Number.isInteger(Number(item)) && Number(item) > 0;
const viewName = (name, label) => {
  if (
    !/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*){0,3}$/.test(name || "")
  ) {
    throw new Error(`${label} must be a schema-qualified MSSQL view name.`);
  }
  return name
    .split(".")
    .map((part) => `[${part}]`)
    .join(".");
};
const time = (input) => {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return `${String(input.getHours()).padStart(2, "0")}:${String(input.getMinutes()).padStart(2, "0")}:${String(input.getSeconds()).padStart(2, "0")}`;
  }
  const match = String(input || "")
    .trim()
    .match(/(?:^|[\sT])(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s|$|\.)/);
  return match
    ? `${String(Number(match[1])).padStart(2, "0")}:${match[2]}:${match[3] || "00"}`
    : "";
};
const studentKey = (record) =>
  normalize(
    value(
      record,
      "student_id",
      "student_number",
      "id_number",
      "username",
      "id",
    ),
  );
const teacherKey = (givenname, surname) =>
  `${givenname || ""} ${surname || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

function settings() {
  const server = String(process.env.MSSQL_HOST || "").trim();
  const database = String(process.env.MSSQL_DATABASE || "").trim();
  const user = String(process.env.MSSQL_USER || "").trim();
  const password = String(process.env.MSSQL_PASSWORD || "");
  const studentView = viewName(
    process.env.MSSQL_STUDENTS_VIEW,
    "MSSQL_STUDENTS_VIEW",
  );
  const subjectView = process.env.MSSQL_STUDENT_SUBJECTS_VIEW
    ? viewName(
        process.env.MSSQL_STUDENT_SUBJECTS_VIEW,
        "MSSQL_STUDENT_SUBJECTS_VIEW",
      )
    : null;
  if (!server || !database || !user || !password)
    throw new Error("MSSQL connection settings are incomplete.");
  return {
    studentView,
    subjectView,
    config: {
      user,
      password,
      server,
      database,
      port: Number(process.env.MSSQL_PORT || 1433),
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === "true",
        trustServerCertificate:
          process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false",
      },
    },
  };
}

async function sourceRows(options) {
  const config = settings();
  const pool = await new sql.ConnectionPool(config.config).connect();
  try {
    const students =
      options.importStudents || options.importSubjects
        ? (await pool.request().query(`SELECT * FROM ${config.studentView}`))
            .recordset
        : [];
    if (options.importSubjects && !config.subjectView) {
      throw new Error(
        "MSSQL_STUDENT_SUBJECTS_VIEW must be configured for student-course imports.",
      );
    }
    const subjects = options.importSubjects
      ? (await pool.request().query(`SELECT * FROM ${config.subjectView}`))
          .recordset
      : [];
    return { students, subjects };
  } finally {
    await pool.close();
  }
}

// Return MSSQL course-view rows in the exact column shape consumed by the
// existing XLSX import classifier. This keeps one validation/import workflow.
async function studentCourses() {
  const config = settings();
  if (!config.subjectView) {
    throw new Error("MSSQL_STUDENT_SUBJECTS_VIEW must be configured.");
  }
  const pool = await new sql.ConnectionPool(config.config).connect();
  try {
    const source = (
      await pool.request().query(`SELECT * FROM ${config.subjectView}`)
    ).recordset;
    return source.map((row) => ({
      StudentID: value(row, "student_id", "studentid", "username"),
      SchoolYear: value(row, "source_school_year", "school_year", "schoolyear"),
      semester_id: value(row, "source_semester", "semester_id", "semester"),
      SubjectCode: value(row, "subject_code", "subjectcode"),
      Description: value(row, "subject_name", "description"),
      TeacherFirstName: value(row, "teacher_first_name", "teacherfirstname"),
      TeacherMiddleName: value(row, "teacher_middle_name", "teachermiddlename"),
      TeacherLastName: value(row, "teacher_last_name", "teacherlastname"),
      RoomCode: value(row, "room_code", "roomcode"),
      ScheduleCode: value(row, "schedule_code", "schedulecode"),
      time_start: time(value(row, "time_start", "timebegin")),
      time_end: time(value(row, "time_end", "timeend")),
      day: value(row, "day", "day_code", "daycode"),
    }));
  } finally {
    await pool.close();
  }
}

async function localData(connection) {
  const [
    [users],
    [courses],
    [subjects],
    [teachers],
    [rooms],
    [departments],
    [periods],
  ] = await Promise.all([
    connection.query(
      "SELECT users.id, users.username, users.google_email, users.is_active, user_info.surname, user_info.givenname, user_info.middlename, user_info.course_id, user_info.year_level, user_info.gender, schools.code AS school_code FROM users INNER JOIN user_info ON user_info.user_id = users.id LEFT JOIN courses ON courses.id = user_info.course_id LEFT JOIN departments ON departments.id = courses.department_id LEFT JOIN colleges ON colleges.id = departments.college_id LEFT JOIN schools ON schools.id = colleges.school_id WHERE users.is_student_rater = 1",
    ),
    connection.query("SELECT id, code FROM courses WHERE is_active = 1"),
    connection.query("SELECT id, code FROM subjects WHERE is_active = 1"),
    connection.query(
      "SELECT teachers.id, teachers.givenname, teachers.surname, teachers.middlename, teachers.department_id, teachers.is_active FROM teachers",
    ),
    connection.query("SELECT id, name, is_active FROM rooms"),
    connection.query(
      "SELECT departments.id, departments.code, schools.id AS school_id FROM departments INNER JOIN colleges ON colleges.id = departments.college_id INNER JOIN schools ON schools.id = colleges.school_id",
    ),
    connection.query(
      "SELECT school_years.id AS school_year_id, semesters.id AS semester_id FROM school_years CROSS JOIN semesters",
    ),
  ]);
  return { users, courses, subjects, teachers, rooms, departments, periods };
}

function maps(data) {
  return {
    users: new Map(data.users.map((row) => [normalize(row.username), row])),
    courses: new Map(data.courses.map((row) => [normalize(row.code), row])),
    subjects: new Map(data.subjects.map((row) => [normalize(row.code), row])),
    teachersById: new Map(data.teachers.map((row) => [String(row.id), row])),
    teachersByName: data.teachers.reduce((map, row) => {
      const key = teacherKey(row.givenname, row.surname);
      const current = map.get(key);
      // Prefer an active record if duplicate name records exist.
      if (!current || Number(row.is_active) === 1) map.set(key, row);
      return map;
    }, new Map()),
    rooms: new Map(data.rooms.map((row) => [normalize(row.name), row])),
    departments: new Map(
      data.departments.map((row) => [normalize(row.code), row]),
    ),
  };
}

function studentRecord(row, index, local) {
  const username = studentKey(row);
  const courseCode = value(row, "course_code", "program_code", "course");
  const gender = value(row, "gender").toUpperCase();
  const yearLevel = value(row, "year_level", "yearlevel", "year");
  const surname = value(row, "surname", "last_name", "lastname");
  const givenname = value(row, "givenname", "first_name", "firstname");
  const middlename = value(row, "middlename", "middle_name", "middlename");
  const sourceEmail = value(
    row,
    "google_email",
    "email",
    "institutional_email",
  );
  const record = {
    row: index + 1,
    username,
    surname,
    givenname,
    middlename,
    google_email: sourceEmail || null,
    course_code: courseCode,
    course_id: local.courses.get(normalize(courseCode))?.id,
    year_level: yearLevel,
    gender,
    original: row,
  };
  if (
    !username ||
    !record.surname ||
    !record.givenname ||
    !yearLevel ||
    !gender ||
    !courseCode
  )
    record.error =
      "Student ID, name, program, year level, and gender are required.";
  else if (!record.course_id)
    record.error = `Program '${courseCode}' was not found locally.`;
  else if (!["MALE", "FEMALE"].includes(gender))
    record.error = "Gender must be Male or Female.";
  return record;
}

function selectCollegeDeactivations(users, sourceStudents) {
  const sourceIds = new Set(
    sourceStudents
      .map((student) => normalize(student.username))
      .filter(Boolean),
  );
  // An empty or malformed source must never deactivate the entire College roster.
  if (!sourceIds.size)
    throw new Error(
      "The MSSQL student view returned no student IDs. No students were deactivated.",
    );
  return users.filter(
    (student) =>
      Number(student.is_active) === 1 &&
      normalize(student.school_code) === "college" &&
      !sourceIds.has(normalize(student.username)),
  );
}

function subjectRecord(row, index, local, students) {
  const username = studentKey(row);
  const subjectCode = value(row, "subject_code", "course_code", "subject");
  // Legacy instructor IDs are not SATP teacher IDs. Only an explicitly
  // supplied local_teacher_id/teacher_id may be used for a direct match.
  const teacherId = value(row, "local_teacher_id", "teacher_id");
  const teacherGivenname = value(
    row,
    "teacher_first_name",
    "teacher_givenname",
    "instructor_first_name",
  );
  const teacherSurname = value(
    row,
    "teacher_last_name",
    "teacher_surname",
    "instructor_last_name",
  );
  const teacherMiddlename = value(
    row,
    "teacher_middle_name",
    "teacher_middlename",
    "instructor_middle_name",
  );
  const teacher =
    local.teachersById.get(teacherId) ||
    local.teachersByName.get(teacherKey(teacherGivenname, teacherSurname));
  const course = local.subjects.get(normalize(subjectCode));
  const student = students.get(username) || local.users.get(username);
  const schedule_code = value(row, "schedule_code", "section", "section_code");
  const starts = time(value(row, "time_start", "start_time", "timestart"));
  const ends = time(value(row, "time_end", "end_time", "timeend"));
  const day = value(row, "day", "days", "day_code");
  const deptCode = value(
    row,
    "teaching_department_code",
    "department_code",
    "department",
  );
  const department = local.departments.get(normalize(deptCode));
  const roomCode = value(row, "room_code", "room");
  const room = local.rooms.get(normalize(roomCode));
  const placeholderDepartment = local.departments.get("-");
  const record = {
    row: index + 1,
    username,
    student,
    subject: course,
    teacher,
    teacher_givenname: teacherGivenname,
    teacher_surname: teacherSurname,
    teacher_middlename: teacherMiddlename,
    schedule_code,
    time_start: starts,
    time_end: ends,
    day,
    room_code: roomCode,
    room,
    department,
    placeholder_department: placeholderDepartment,
    original: row,
  };
  if (!username || !student)
    record.error =
      "Student was not found locally or in the source student view.";
  else if (!course)
    record.error = `Subject '${subjectCode}' was not found locally.`;
  else if (!teacher && (!teacherGivenname || !teacherSurname))
    record.error =
      "Teacher first and last name are required when the teacher is not already in SATP.";
  else if (!schedule_code || !starts || !ends || !day)
    record.error = "Schedule code, start time, end time, and day are required.";
  else if (!teacher && !placeholderDepartment)
    record.error =
      "The '-' department must exist before a new teacher can be imported.";
  return record;
}

async function buildPlan(options, connection, rows) {
  const data = await localData(connection);
  const local = maps(data);
  // Enrollment rows always need the source student view for identity matching,
  // but we only schedule student writes when that import was selected.
  const sourceStudents = rows.students
    .map((row, index) => studentRecord(row, index, local))
    .sort(
      (left, right) =>
        left.username.localeCompare(right.username) || left.row - right.row,
    );
  const studentRows = options.importStudents ? sourceStudents : [];
  // Include IDs from invalid source rows so a profile validation error cannot
  // inadvertently deactivate a student who is actually on the roster.
  const deactivationCandidates = options.importStudents
    ? selectCollegeDeactivations(data.users, sourceStudents)
    : [];
  const rosterToken = options.importStudents
    ? createHash("sha256")
        .update(
          JSON.stringify({
            sourceIds: [
              ...new Set(
                sourceStudents
                  .map((student) => student.username)
                  .filter(Boolean),
              ),
            ].sort(),
            deactivationIds: deactivationCandidates
              .map((student) => student.id)
              .sort((a, b) => a - b),
          }),
        )
        .digest("hex")
    : null;
  const validStudents = new Map();
  const studentSummary = {
    created: 0,
    updated: 0,
    reactivated: 0,
    deactivated: deactivationCandidates.length,
    errors: [],
  };
  for (const record of sourceStudents) {
    if (!record.error) {
      const existing = local.users.get(record.username);
      if (existing) record.id = existing.id;
      validStudents.set(record.username, record);
    }
  }
  const seenStudentIds = new Set();
  for (const record of studentRows) {
    if (!record.error && seenStudentIds.has(record.username)) {
      record.error = "Duplicate student ID in the MSSQL student view.";
    }
    seenStudentIds.add(record.username);
    if (record.error)
      studentSummary.errors.push({
        row: record.row,
        student: record.username || "(blank)",
        reason: record.error,
      });
    else {
      const existing = local.users.get(record.username);
      if (existing) {
        record.id = existing.id;
        record.reactivating = Number(existing.is_active) !== 1;
        studentSummary.updated++;
        if (record.reactivating) studentSummary.reactivated++;
      } else studentSummary.created++;
    }
  }
  const subjectSummary = { created: 0, updated: 0, skipped: 0, errors: [] };
  const subjectRows = options.importSubjects
    ? rows.subjects.map((row, index) =>
        subjectRecord(row, index, local, validStudents),
      )
    : [];
  if (options.importSubjects) {
    const [existing] = await connection.query(
      "SELECT id, student_id, subject_id, teacher_id, schedule_code, time_start, time_end, day, room_id FROM academic_records_consolidated WHERE school_year_id = ? AND semester_id = ?",
      [options.school_year_id, options.semester_id],
    );
    // College imports use one enrollment per student and subject. Teacher,
    // schedule, time, and room changes update that enrollment instead of
    // creating a duplicate course row.
    const existingKeys = new Map(
      existing.map((entry) => [
        `${entry.student_id}|${entry.subject_id}`,
        entry,
      ]),
    );
    for (const record of subjectRows) {
      if (record.error) {
        subjectSummary.errors.push({
          row: record.row,
          student: record.username || "(blank)",
          reason: record.error,
        });
        continue;
      }
      const studentId = record.student.id || record.student.user_id;
      const key = `${studentId || "new:" + record.username}|${record.subject.id}`;
      const current = existingKeys.get(key);
      if (!current) {
        record.preview_action = "created";
        subjectSummary.created++;
      } else if (
        Number(current.teacher_id) === Number(record.teacher?.id) &&
        normalize(current.schedule_code) === normalize(record.schedule_code) &&
        time(current.time_start) === record.time_start &&
        time(current.time_end) === record.time_end &&
        normalize(current.day) === normalize(record.day) &&
        Number(current.room_id || 0) === Number(record.room?.id || 0)
      ) {
        record.preview_action = "skipped";
        subjectSummary.skipped++;
      } else {
        record.preview_action = "updated";
        subjectSummary.updated++;
      }
    }
  }
  const previewStudent = (record) => ({
    rowNumber: record.row,
    idNumber: record.username,
    username: record.username,
    givenname: record.givenname,
    surname: record.surname,
    reason: record.error,
    reactivating: Boolean(record.reactivating),
  });
  const previewSubject = (record) => ({
    rowNumber: record.row,
    originalRow: {
      StudentID: record.username,
      SubjectCode: record.subject?.code || "",
    },
    reason: record.error,
  });
  return {
    studentRows,
    subjectRows,
    deactivationCandidates,
    rosterToken,
    summary: { students: studentSummary, student_subjects: subjectSummary },
    preview: {
      created: studentRows
        .filter((record) => !record.error && !record.id)
        .map(previewStudent),
      updated: studentRows
        .filter((record) => !record.error && record.id)
        .map(previewStudent),
      deactivated: deactivationCandidates.map((student) => ({
        rowNumber: null,
        idNumber: student.username,
        givenname: student.givenname,
        surname: student.surname,
        reason: "Absent from the MSSQL College roster; will be deactivated",
      })),
      errors: studentRows.filter((record) => record.error).map(previewStudent),
      student_subjects: {
        created: subjectRows
          .filter(
            (record) => !record.error && record.preview_action === "created",
          )
          .map(previewSubject),
        updated: subjectRows
          .filter(
            (record) => !record.error && record.preview_action === "updated",
          )
          .map(previewSubject),
        errors: subjectRows
          .filter((record) => record.error)
          .map(previewSubject),
        schoolId: null,
      },
    },
  };
}

async function plan(options) {
  const connection = await mysql.promise().getConnection();
  try {
    const built = await buildPlan(
      options,
      connection,
      await sourceRows(options),
    );
    return {
      ...built.summary,
      preview: built.preview,
      roster_token: built.rosterToken,
    };
  } finally {
    connection.release();
  }
}

async function run(options) {
  const connection = await mysql.promise().getConnection();
  try {
    const built = await buildPlan(
      options,
      connection,
      await sourceRows(options),
    );
    if (
      options.importStudents &&
      (!options.roster_token || options.roster_token !== built.rosterToken)
    ) {
      throw new Error(
        "The MSSQL student roster or deactivation list changed since preview. Preview the import again before running it.",
      );
    }
    await connection.beginTransaction();
    const result = {
      students: {
        created: 0,
        updated: 0,
        reactivated: 0,
        deactivated: 0,
        errors: built.summary.students.errors,
      },
      student_subjects: {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: built.summary.student_subjects.errors,
      },
      teachers: { created: 0, reactivated: 0 },
      rooms: { created: 0, reactivated: 0 },
    };
    const ids = new Map();
    for (const record of built.studentRows) {
      if (record.error) continue;
      const existing = await connection.query(
        "SELECT id, is_active FROM users WHERE username = ? LIMIT 1",
        [record.username],
      );
      let id = existing[0][0]?.id;
      if (id) {
        await connection.query(
          "UPDATE users INNER JOIN user_info ON user_info.user_id = users.id SET users.is_active = 1, user_info.surname = ?, user_info.givenname = ?, user_info.middlename = ?, user_info.course_id = ?, user_info.year_level = ?, user_info.gender = ? WHERE users.id = ?",
          [
            record.surname,
            record.givenname,
            record.middlename || null,
            record.course_id,
            record.year_level,
            record.gender,
            id,
          ],
        );
        result.students.updated++;
        if (Number(existing[0][0].is_active) !== 1)
          result.students.reactivated++;
      } else {
        const [insert] = await connection.query(
          "INSERT INTO users (username, password, google_email, permission_id, is_temp_pass, is_student_rater, is_admin_rater, admin_academic_scope, is_active) VALUES (?, NULL, ?, 5, 1, 1, 0, NULL, 1)",
          [record.username, record.google_email],
        );
        id = insert.insertId;
        await connection.query(
          "INSERT INTO user_info (user_id, surname, givenname, middlename, course_id, year_level, gender) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            id,
            record.surname,
            record.givenname,
            record.middlename || null,
            record.course_id,
            record.year_level,
            record.gender,
          ],
        );
        result.students.created++;
      }
      ids.set(record.username, id);
    }
    const resolvedTeachers = new Map();
    const resolvedRooms = new Map();
    for (const record of built.subjectRows) {
      if (record.error) continue;
      const studentId = ids.get(record.username) || record.student.id;
      if (!studentId) {
        result.student_subjects.errors.push({
          row: record.row,
          student: record.username,
          reason: "Student could not be created.",
        });
        continue;
      }
      const teacherCacheKey = record.teacher
        ? `id:${record.teacher.id}`
        : `name:${teacherKey(record.teacher_givenname, record.teacher_surname)}`;
      let teacher = resolvedTeachers.get(teacherCacheKey);
      if (!teacher) {
        if (record.teacher) {
          teacher = record.teacher;
          if (Number(teacher.is_active) !== 1) {
            await connection.query(
              "UPDATE teachers SET is_active = 1 WHERE id = ?",
              [teacher.id],
            );
            result.teachers.reactivated++;
            teacher = { ...teacher, is_active: 1 };
          }
        } else {
          const [matched] = await connection.query(
            "SELECT id, is_active FROM teachers WHERE givenname = ? AND surname = ? LIMIT 1",
            [record.teacher_givenname, record.teacher_surname],
          );
          if (matched.length) {
            teacher = matched[0];
            if (Number(teacher.is_active) !== 1) {
              await connection.query(
                "UPDATE teachers SET is_active = 1 WHERE id = ?",
                [teacher.id],
              );
              result.teachers.reactivated++;
              teacher.is_active = 1;
            }
          } else {
            const [created] = await connection.query(
              "INSERT INTO teachers (surname, givenname, middlename, department_id, is_active) VALUES (?, ?, ?, ?, 1)",
              [
                record.teacher_surname,
                record.teacher_givenname,
                record.teacher_middlename || null,
                record.placeholder_department.id,
              ],
            );
            teacher = { id: created.insertId, is_active: 1 };
            result.teachers.created++;
            await connection.query(
              "INSERT INTO teacher_departments (teacher_id, department_id, is_primary, teaching_status) VALUES (?, ?, 1, 0) ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary), teaching_status = VALUES(teaching_status)",
              [teacher.id, record.placeholder_department.id],
            );
          }
        }
        resolvedTeachers.set(teacherCacheKey, teacher);
      }
      let roomId = null;
      if (record.room_code) {
        const roomCacheKey = normalize(record.room_code);
        let room = resolvedRooms.get(roomCacheKey);
        if (!room) {
          if (record.room) {
            room = record.room;
            if (Number(room.is_active) !== 1) {
              await connection.query(
                "UPDATE rooms SET is_active = 1 WHERE id = ?",
                [room.id],
              );
              result.rooms.reactivated++;
              room = { ...room, is_active: 1 };
            }
          } else {
            const [matchedRooms] = await connection.query(
              "SELECT id, is_active FROM rooms WHERE name = ? LIMIT 1",
              [record.room_code],
            );
            if (matchedRooms.length) {
              room = matchedRooms[0];
              if (Number(room.is_active) !== 1) {
                await connection.query(
                  "UPDATE rooms SET is_active = 1 WHERE id = ?",
                  [room.id],
                );
                result.rooms.reactivated++;
                room.is_active = 1;
              }
            } else {
              const [createdRoom] = await connection.query(
                "INSERT INTO rooms (name, is_active) VALUES (?, 1)",
                [record.room_code],
              );
              room = { id: createdRoom.insertId, is_active: 1 };
              result.rooms.created++;
            }
          }
          resolvedRooms.set(roomCacheKey, room);
        }
        roomId = room.id;
      }
      const [found] = await connection.query(
        "SELECT id, teacher_id, schedule_code, time_start, time_end, day, room_id FROM academic_records_consolidated WHERE student_id = ? AND school_year_id = ? AND semester_id = ? AND subject_id = ? ORDER BY id LIMIT 1",
        [
          studentId,
          options.school_year_id,
          options.semester_id,
          record.subject.id,
        ],
      );
      if (!found.length) {
        await connection.query(
          "INSERT INTO academic_records_consolidated (school_year_id, semester_id, subject_id, teacher_id, student_id, schedule_code, time_start, time_end, day, room_id, is_excluded, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)",
          [
            options.school_year_id,
            options.semester_id,
            record.subject.id,
            teacher.id,
            studentId,
            record.schedule_code,
            record.time_start,
            record.time_end,
            record.day,
            roomId,
          ],
        );
        result.student_subjects.created++;
      } else if (
        Number(found[0].teacher_id) === Number(teacher.id) &&
        normalize(found[0].schedule_code) === normalize(record.schedule_code) &&
        time(found[0].time_start) === record.time_start &&
        time(found[0].time_end) === record.time_end &&
        normalize(found[0].day) === normalize(record.day) &&
        Number(found[0].room_id || 0) === Number(roomId || 0)
      )
        result.student_subjects.skipped++;
      else {
        await connection.query(
          "UPDATE academic_records_consolidated SET teacher_id = ?, schedule_code = ?, time_start = ?, time_end = ?, day = ?, room_id = ? WHERE id = ?",
          [
            teacher.id,
            record.schedule_code,
            record.time_start,
            record.time_end,
            record.day,
            roomId,
            found[0].id,
          ],
        );
        result.student_subjects.updated++;
      }
    }
    for (
      let index = 0;
      index < built.deactivationCandidates.length;
      index += 500
    ) {
      const candidateIds = built.deactivationCandidates
        .slice(index, index + 500)
        .map((student) => student.id);
      const [updated] = await connection.query(
        "UPDATE users INNER JOIN user_info ON user_info.user_id = users.id INNER JOIN courses ON courses.id = user_info.course_id INNER JOIN departments ON departments.id = courses.department_id INNER JOIN colleges ON colleges.id = departments.college_id INNER JOIN schools ON schools.id = colleges.school_id SET users.is_active = 0 WHERE users.id IN (?) AND users.is_student_rater = 1 AND users.is_active = 1 AND UPPER(TRIM(schools.code)) = 'COLLEGE'",
        [candidateIds],
      );
      result.students.deactivated += updated.affectedRows;
    }
    await connection.query(
      "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
      [
        options.user_id,
        `MSSQL import: ${result.students.created} students created, ${result.students.updated} students updated, ${result.students.deactivated} students deactivated, ${result.student_subjects.created} student courses created, ${result.student_subjects.updated} student courses updated.`,
      ],
    );
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { plan, run, studentCourses, selectCollegeDeactivations };
