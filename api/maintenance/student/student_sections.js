"use strict";

function selectStudentSections(rows) {
  const students = new Map();
  for (const row of rows) {
    const { section_room, section_subject_count, ...student } = row;
    let entry = students.get(student.id);
    if (!entry) {
      entry = { student: { ...student, section: "" }, count: 1, tied: false };
      students.set(student.id, entry);
    }
    const count = Number(section_subject_count);
    if (student.academic_scope !== "SHS" || !section_room || count <= 1) continue;
    if (count > entry.count) {
      entry.count = count;
      entry.student.section = section_room;
      entry.tied = false;
    } else if (count === entry.count) {
      entry.tied = true;
    }
  }
  return [...students.values()].map(({ student, tied }) => ({
    ...student, section: tied ? "" : student.section,
  }));
}

module.exports = { selectStudentSections };
