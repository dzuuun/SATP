"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateRoster,
  selectDeactivations,
  selectedCandidates,
  nameKey,
} = require("../api/maintenance/teacher/teacher_roster.service");
const {
  requireSuperAdmin,
  requireSameOrigin,
} = require("../auth/auth_validation");

test("College instructor list checks only first and last name", () => {
  const roster = validateRoster([
    {
      InstructorID: "101",
      FirstName: "Maria",
      LastName: "De la Cruz",
      StatusCode: "FT",
    },
    {
      InstructorID: "different",
      FirstName: "Maria",
      LastName: "De la Cruz",
      StatusCode: "ignored",
    },
  ]);
  assert.equal(roster.instructorCount, 1);
  assert.equal(roster.names.has(nameKey("Maria", "De la Cruz")), true);
  assert.throws(() => validateRoster([]), /nonempty College instructor list/);
  assert.throws(
    () => validateRoster([{ InstructorID: "101", FirstName: "Maria" }]),
    /needs FirstName and LastName/,
  );
});

test("only absent active College-only teachers are selected", () => {
  const teachers = [
    {
      id: 1,
      givenname: "Maria",
      surname: "Cruz",
      is_active: 1,
      has_college: 1,
      has_other_school: 0,
    },
    {
      id: 2,
      givenname: "Ana",
      surname: "Reyes",
      is_active: 1,
      has_college: 1,
      has_other_school: 0,
    },
    {
      id: 3,
      givenname: "Ben",
      surname: "Santos",
      is_active: 1,
      has_college: 1,
      has_other_school: 1,
    },
    {
      id: 4,
      givenname: "Cora",
      surname: "Tan",
      is_active: 1,
      has_college: 0,
      has_other_school: 1,
    },
    {
      id: 5,
      givenname: "Dan",
      surname: "Lim",
      is_active: 0,
      has_college: 1,
      has_other_school: 0,
    },
    {
      id: 6,
      givenname: "Ella",
      surname: "Yu",
      is_active: 1,
      has_college: 1,
      has_other_school: 0,
      has_current_course: 1,
    },
  ];
  assert.deepEqual(
    selectDeactivations(teachers, new Set([nameKey("Maria", "Cruz")])).map(
      (teacher) => teacher.id,
    ),
    [2],
  );
});

test("only checked teachers from the validated preview can be deactivated", () => {
  const candidates = [{ id: 2 }, { id: 4 }];
  assert.deepEqual(
    selectedCandidates(candidates, [4]).map((teacher) => teacher.id),
    [4],
  );
  assert.throws(
    () => selectedCandidates(candidates, [3]),
    /not part of the validated deactivation preview/,
  );
  assert.throws(
    () => selectedCandidates(candidates),
    /Select the College teachers/,
  );
});

test("College teacher roster routes require Super Admin, with a same-origin run guard", () => {
  const router = require("../api/maintenance/teacher/teacher.router");
  const preview = router.stack.find(
    (layer) => layer.route?.path === "/roster/preview",
  )?.route;
  const run = router.stack.find(
    (layer) => layer.route?.path === "/roster/run",
  )?.route;
  assert.ok(preview);
  assert.ok(run);
  assert.equal(preview.stack[0].handle, requireSuperAdmin);
  assert.equal(run.stack[0].handle, requireSuperAdmin);
  assert.equal(run.stack[1].handle, requireSameOrigin);
});

test("previewed selections execute atomically and reject stale or forged IDs", async () => {
  const pool = require("../db/db");
  const service = require("../api/maintenance/teacher/teacher_roster.service");
  const originalPromise = pool.promise;
  const statements = [];
  const teachers = [
    {
      id: 1,
      givenname: "Maria",
      surname: "Cruz",
      is_active: 1,
      has_college: 1,
      has_other_school: 0,
    },
    {
      id: 2,
      givenname: "Ana",
      surname: "Reyes",
      is_active: 1,
      has_college: 1,
      has_other_school: 0,
    },
    {
      id: 3,
      givenname: "Ben",
      surname: "Tan",
      is_active: 1,
      has_college: 1,
      has_other_school: 1,
    },
  ];
  const connection = {
    async query(sql, params) {
      statements.push({ sql, params });
      if (sql.includes("FROM teachers")) return [teachers];
      if (sql.includes("UPDATE teachers")) return [{ changedRows: 1 }];
      return [{}];
    },
    async beginTransaction() {
      statements.push({ sql: "BEGIN" });
    },
    async commit() {
      statements.push({ sql: "COMMIT" });
    },
    async rollback() {
      statements.push({ sql: "ROLLBACK" });
    },
    release() {},
  };
  pool.promise = () => ({ getConnection: async () => connection });
  const rows = [
    { FirstName: "Maria", LastName: "Cruz", UnusedColumn: "ignored" },
  ];
  try {
    const preview = await service.preview(rows);
    assert.deepEqual(
      preview.deactivated.map((teacher) => teacher.id),
      [2],
    );
    await assert.rejects(
      service.preview([{ FirstName: "Nobody", LastName: "Here" }]),
      /No College teacher names match/,
    );
    await assert.rejects(
      service.run(rows, "stale-token", [2], 9),
      /changed since preview/,
    );
    assert.equal(
      statements.some(({ sql }) => sql.includes("UPDATE teachers")),
      false,
    );
    await assert.rejects(
      service.run(rows, preview.token, [999], 9),
      /not part of the validated deactivation preview/,
    );
    const result = await service.run(rows, preview.token, [2], 9);
    assert.equal(result.deactivated, 1);
    const update = statements.find(({ sql }) =>
      sql.includes("UPDATE teachers"),
    );
    assert.deepEqual(update.params, [[2]]);
    assert.equal(statements.at(-1).sql, "COMMIT");
  } finally {
    pool.promise = originalPromise;
  }
});
