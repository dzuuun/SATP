const test = require("node:test");
const assert = require("node:assert/strict");
const {
  selectCollegeDeactivations,
} = require("../api/maintenance/mssql_import/mssql_import.service");

test("MSSQL roster deactivates only active College students absent from the source", () => {
  const users = [
    { id: 1, username: "1001", is_active: 1, school_code: "COLLEGE" },
    { id: 2, username: "1002", is_active: 1, school_code: "COLLEGE" },
    { id: 3, username: "2001", is_active: 1, school_code: "SHS" },
    { id: 4, username: "3001", is_active: 0, school_code: "COLLEGE" },
    { id: 5, username: "4001", is_active: 1, school_code: "OTHER" },
  ];
  // A source ID still protects an existing student when its profile row fails validation.
  const source = [
    { username: " 1001 " },
    { username: "5001", error: "Invalid profile" },
  ];
  assert.deepEqual(
    selectCollegeDeactivations(users, source).map((student) => student.id),
    [2],
  );
});

test("MSSQL roster rejects an empty student-ID list before any deactivation", () => {
  assert.throws(
    () =>
      selectCollegeDeactivations(
        [{ id: 1, username: "1001", is_active: 1, school_code: "COLLEGE" }],
        [{ username: "" }],
      ),
    /returned no student IDs/,
  );
});
