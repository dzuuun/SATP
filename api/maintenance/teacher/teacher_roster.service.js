const { createHash } = require("node:crypto");
const pool = require("../../../db/db");

const normalize = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
const nameKey = (first, last) => `${normalize(first)}|${normalize(last)}`;
const field = (row, name) => {
  const key = Object.keys(row).find(
    (item) => normalize(item).replace(/ /g, "") === normalize(name),
  );
  return String(key ? (row[key] ?? "") : "").trim();
};

function validateRoster(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 20000) {
    throw new Error(
      "Upload a nonempty College instructor list with no more than 20,000 rows.",
    );
  }
  const names = new Set();
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`Row ${index + 2} is not a valid instructor record.`);
    }
    const first = field(row, "FirstName");
    const last = field(row, "LastName");
    if (!first || !last) {
      throw new Error(`Row ${index + 2} needs FirstName and LastName.`);
    }
    names.add(nameKey(first, last));
  });
  return { instructorCount: names.size, names };
}

function selectDeactivations(teachers, names) {
  return teachers.filter(
    (teacher) =>
      Number(teacher.is_active) === 1 &&
      Number(teacher.has_college) === 1 &&
      Number(teacher.has_other_school) !== 1 &&
      Number(teacher.has_current_course) !== 1 &&
      !names.has(nameKey(teacher.givenname, teacher.surname)),
  );
}

async function buildPlan(connection, rows) {
  const roster = validateRoster(rows);
  const [teachers] = await connection.query(`
    SELECT teachers.id, teachers.givenname, teachers.surname, teachers.middlename,
      teachers.is_active,
      EXISTS (
        SELECT 1
        FROM academic_records_consolidated AS current_course
        INNER JOIN school_years AS current_year
          ON current_year.id = current_course.school_year_id
         AND current_year.in_use = 1
         AND current_year.is_active = 1
        INNER JOIN semesters AS current_semester
          ON current_semester.id = current_course.semester_id
         AND current_semester.is_current_college = 1
         AND current_semester.is_active = 1
        WHERE current_course.teacher_id = teachers.id
        LIMIT 1
      ) AS has_current_course,
      MAX(CASE WHEN UPPER(TRIM(primary_school.code)) = 'COLLEGE' OR UPPER(TRIM(linked_school.code)) = 'COLLEGE' THEN 1 ELSE 0 END) AS has_college,
      MAX(CASE WHEN (teachers.department_id IS NOT NULL AND (primary_school.code IS NULL OR UPPER(TRIM(primary_school.code)) <> 'COLLEGE'))
        OR (teacher_departments.department_id IS NOT NULL AND (linked_school.code IS NULL OR UPPER(TRIM(linked_school.code)) <> 'COLLEGE')) THEN 1 ELSE 0 END) AS has_other_school
    FROM teachers
    LEFT JOIN departments AS primary_department ON primary_department.id = teachers.department_id
    LEFT JOIN colleges AS primary_college ON primary_college.id = primary_department.college_id
    LEFT JOIN schools AS primary_school ON primary_school.id = primary_college.school_id
    LEFT JOIN teacher_departments ON teacher_departments.teacher_id = teachers.id
    LEFT JOIN departments AS linked_department ON linked_department.id = teacher_departments.department_id
    LEFT JOIN colleges AS linked_college ON linked_college.id = linked_department.college_id
    LEFT JOIN schools AS linked_school ON linked_school.id = linked_college.school_id
    WHERE teachers.is_active = 1
    GROUP BY teachers.id, teachers.givenname, teachers.surname, teachers.middlename, teachers.is_active
  `);
  const candidates = selectDeactivations(teachers, roster.names);
  const protectedByCurrentCourse = teachers.filter(
    (teacher) =>
      Number(teacher.is_active) === 1 &&
      Number(teacher.has_college) === 1 &&
      Number(teacher.has_other_school) !== 1 &&
      Number(teacher.has_current_course) === 1 &&
      !roster.names.has(nameKey(teacher.givenname, teacher.surname)),
  ).length;
  const matched = teachers.filter(
    (teacher) =>
      Number(teacher.has_college) === 1 &&
      Number(teacher.has_other_school) !== 1 &&
      roster.names.has(nameKey(teacher.givenname, teacher.surname)),
  ).length;
  if (
    teachers.some(
      (teacher) =>
        Number(teacher.has_college) === 1 &&
        Number(teacher.has_other_school) !== 1,
    ) &&
    matched === 0
  ) {
    throw new Error(
      "No College teacher names match this list. Check that it is the complete College instructor export.",
    );
  }
  const token = createHash("sha256")
    .update(
      JSON.stringify({
        roster: [...roster.names].sort(),
        candidates: candidates
          .map((teacher) => teacher.id)
          .sort((left, right) => left - right),
      }),
    )
    .digest("hex");
  return {
    candidates,
    token,
    instructor_count: roster.instructorCount,
    matched_count: matched,
    current_course_protected_count: protectedByCurrentCourse,
    deactivated_count: candidates.length,
    deactivated: candidates.map((teacher) => ({
      id: teacher.id,
      name: `${teacher.givenname} ${teacher.surname}`.trim(),
      middlename: teacher.middlename || "",
    })),
  };
}

async function preview(rows) {
  const connection = await pool.promise().getConnection();
  try {
    const plan = await buildPlan(connection, rows);
    const { candidates: _candidates, ...result } = plan;
    return result;
  } finally {
    connection.release();
  }
}

function selectedCandidates(candidates, selectedIds) {
  if (!Array.isArray(selectedIds)) {
    throw new Error("Select the College teachers to deactivate.");
  }
  const ids = new Set();
  selectedIds.forEach((value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) {
      throw new Error("The selected teacher list is invalid.");
    }
    ids.add(id);
  });
  const allowedIds = new Set(candidates.map((teacher) => Number(teacher.id)));
  if ([...ids].some((id) => !allowedIds.has(id))) {
    throw new Error(
      "A selected teacher is not part of the validated deactivation preview.",
    );
  }
  return candidates.filter((teacher) => ids.has(Number(teacher.id)));
}

async function run(rows, previewToken, selectedIds, actorId) {
  const connection = await pool.promise().getConnection();
  let transactionStarted = false;
  try {
    const plan = await buildPlan(connection, rows);
    if (!previewToken || previewToken !== plan.token) {
      throw new Error(
        "The College teacher list changed since preview. Preview it again before deactivating teachers.",
      );
    }
    selectedCandidates(plan.candidates, selectedIds);
    await connection.beginTransaction();
    transactionStarted = true;
    for (let index = 0; index < plan.candidates.length; index += 500) {
      const ids = plan.candidates
        .slice(index, index + 500)
        .map((teacher) => teacher.id);
      await connection.query(
        "SELECT id FROM teachers WHERE id IN (?) FOR UPDATE",
        [ids],
      );
    }
    const lockedPlan = await buildPlan(connection, rows);
    if (lockedPlan.token !== previewToken) {
      throw new Error(
        "The College teacher list changed while starting the import. Preview it again before deactivating teachers.",
      );
    }
    const selected = selectedCandidates(lockedPlan.candidates, selectedIds);
    let deactivated = 0;
    for (let index = 0; index < selected.length; index += 500) {
      const ids = selected
        .slice(index, index + 500)
        .map((teacher) => teacher.id);
      const [updated] = await connection.query(
        "UPDATE teachers SET is_active = 0 WHERE id IN (?) AND is_active = 1",
        [ids],
      );
      deactivated += updated.changedRows;
    }
    await connection.query(
      "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
      [
        actorId,
        `College instructor list upload: deactivated ${deactivated} teachers absent from the list.`,
      ],
    );
    await connection.commit();
    return { deactivated };
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  preview,
  run,
  validateRoster,
  selectDeactivations,
  selectedCandidates,
  nameKey,
};
