"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

test("shared student-course import creates missing teachers in - as full-time", () => {
  const script = readFileSync(
    join(__dirname, "../client/maintenance/student_subject/script.js"),
    "utf8",
  );
  assert.match(
    script,
    /const fallbackTeacherDepartment = importDepartmentsByCode\.get\("-"\)/,
  );
  assert.match(
    script,
    /department_id: fallbackTeacherDepartment\.id,[\s\S]*?is_part_time: 0/,
  );
  assert.match(script, /will be created in - as Full Time/);
});

test("direct MSSQL student-course execution also assigns full-time status", () => {
  const service = readFileSync(
    join(__dirname, "../api/maintenance/mssql_import/mssql_import.service.js"),
    "utf8",
  );
  assert.match(
    service,
    /INSERT INTO teacher_departments \(teacher_id, department_id, is_primary, teaching_status\) VALUES \(\?, \?, 1, 0\)/,
  );
  assert.match(service, /\[teacher\.id, record\.placeholder_department\.id\]/);
});
