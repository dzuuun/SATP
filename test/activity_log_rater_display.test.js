"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

test("activity log resolves student-rater usernames only after paging", async () => {
  const pool = require("../db/db");
  const { getLog } = require("../api/user/activity_log/log.model");
  const originalQuery = pool.query;
  const queries = [];
  try {
    pool.query = (sql, params, callback) => {
      queries.push({ sql, params });
      if (sql.includes("SELECT COUNT(*) AS total")) {
        callback(null, [{ total: 2 }]);
      } else if (
        sql.includes("SELECT id, username FROM users WHERE is_student_rater")
      ) {
        callback(null, [{ id: 10, username: "1001" }]);
      } else if (sql.includes("FROM activity_log AS a")) {
        callback(null, [
          {
            id: 1,
            user_id: 10,
            name: "Alice Rater",
            action: "Rated a teacher",
          },
          { id: 2, user_id: 20, name: "Bob Admin", action: "Updated a user" },
        ]);
      } else {
        callback(new Error(`Unexpected query: ${sql}`));
      }
    };
    const page = await new Promise((resolve, reject) => {
      getLog(0, 15, "", 2097, (error, result) =>
        error ? reject(error) : resolve(result),
      );
    });
    assert.deepEqual(
      page.results.map((row) => row.name),
      ["Alice Rater (1001)", "Bob Admin"],
    );
    assert.ok(page.results.every((row) => !("user_id" in row)));
    const pageQuery = queries.find(({ sql }) =>
      sql.includes("ORDER BY a.id DESC"),
    );
    assert.ok(pageQuery);
    assert.doesNotMatch(pageQuery.sql, /JOIN users/);
    const raterQuery = queries.find(({ sql }) =>
      sql.includes("WHERE is_student_rater = 1"),
    );
    assert.deepEqual(raterQuery.params, [10, 20]);
  } finally {
    pool.query = originalQuery;
  }
});

test("activity log escapes the displayed user name", () => {
  const script = readFileSync(
    join(__dirname, "../client/user/activity_log/script.js"),
    "utf8",
  );
  assert.match(
    script,
    /data: "name"[^\n]*render: \$\.fn\.dataTable\.render\.text\(\)/,
  );
});
