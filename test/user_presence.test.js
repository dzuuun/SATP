"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const read = (path) => readFileSync(join(__dirname, "..", path), "utf8");

test("user presence has a persistent timestamp and indexed five-minute count", () => {
  const migration = read("database/migrations/2026-10-01_user_presence.sql");
  const model = read("api/user/user_management/user_management.model.js");
  assert.match(migration, /ADD COLUMN last_seen_at DATETIME NULL/);
  assert.match(migration, /idx_users_active_last_seen/);
  assert.match(
    model,
    /last_seen_at >= DATE_SUB\(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE\)/,
  );
});

test("online count route precedes the parameterized user route", () => {
  const router = require("../api/user/user_management/user_management.router");
  const paths = router.stack.map((layer) => layer.route?.path).filter(Boolean);
  assert.ok(paths.indexOf("/online/count") < paths.indexOf("/:id"));
});

test("authenticated pages send presence heartbeats and User Management displays the count", () => {
  const session = read("client/auth-session.js");
  const page = read("client/user/user_management/index.html");
  const script = read("client/user/user_management/script.js");
  assert.match(session, /setInterval\(presenceHeartbeat, 60 \* 1000\)/);
  assert.match(page, /id="onlineUserCount"/);
  assert.match(script, /\/api\/user\/online\/count/);
  assert.match(script, /setInterval\(loadOnlineUserCount, 30 \* 1000\)/);
});
