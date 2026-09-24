"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../db/db");
const model = require("../api/transaction/studentRatingStatus/srs.model");

function captureQuery(method, group) {
  const original = pool.query;
  let captured;
  pool.query = (sql, params, callback) => {
    captured = { sql, params };
    callback(null, []);
  };
  try {
    model[method]({
      requesting_user_id: 7,
      school_year_id: 4,
      semester_id: 2,
      student_id: "S-100",
      academic_group: group,
    }, () => {});
  } finally {
    pool.query = original;
  }
  return captured;
}

test("transaction views use the selected term without an extra academic-group filter", () => {
  for (const method of [
    "getTransactions",
    "getTransactionsByStudent",
    "getSYSemData",
    "getNotRatedTransactions",
  ]) {
    const shs = captureQuery(method, "SHS");
    const college = captureQuery(method, "COLLEGE");
    const all = captureQuery(method, "ALL");
    assert.equal(shs.sql, all.sql);
    assert.equal(college.sql, all.sql);
    assert.deepEqual(shs.params, all.params);
    assert.deepEqual(college.params, all.params);
  }
});
