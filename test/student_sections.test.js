const test = require("node:test");
const assert = require("node:assert/strict");
const {
  selectStudentSections,
} = require("../api/maintenance/student/student_sections");

test("SHS export chooses the most frequent room even when electives repeat", () => {
  const row = (id, room, count) => ({
    id,
    academic_scope: "SHS",
    section_room: room,
    section_subject_count: count,
  });
  const result = selectStudentSections([
    row(1, "Main section", 8),
    row(1, "Elective section", 2),
    row(2, "Elective section", 2),
    row(2, "Main section", 7),
    row(3, "Only elective", 1),
    row(4, "A", 3),
    row(4, "B", 3),
    row(5, "A", 2),
    row(5, "B", 2),
    row(5, "Main", 6),
    { id: 6, academic_scope: "COLLEGE" },
  ]);
  assert.deepEqual(
    result.map((r) => r.section),
    ["Main section", "Main section", "", "", "Main", ""],
  );
  assert.equal(result.length, 6);
  assert.ok(result.every((r) => !("section_subject_count" in r)));
});
