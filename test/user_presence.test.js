"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

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

function presenceRenderer() {
  const script = read("client/user/user_management/script.js");
  const start = script.indexOf("function userPresence(");
  const end = script.indexOf("async function loadOnlineUserCount", start);
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({});
  vm.runInContext(script.slice(start, end), context);
  return context.userPresence;
}

test("presence displays online only for an active account and formats offline elapsed time", () => {
  const render = presenceRenderer();
  assert.equal(render(1, "filter", { is_active: 1 }), "Online");
  assert.equal(render("1", "filter", { is_active: "1" }), "Online");
  assert.equal(
    render(1, "filter", { is_active: 0, last_seen_seconds: 120 }),
    "Last seen 2 minutes ago",
  );
  for (const [seconds, label] of [
    [0, "0 seconds"],
    [-10, "0 seconds"],
    [1, "1 second"],
    [59, "59 seconds"],
    [60, "1 minute"],
    [119, "1 minute"],
    [120, "2 minutes"],
    [3600, "1 hour"],
    [7200, "2 hours"],
    [86400, "1 day"],
    [2592000, "1 month"],
    [31536000, "1 year"],
  ]) {
    assert.equal(
      render(0, "filter", { is_active: 1, last_seen_seconds: seconds }),
      `Last seen ${label} ago`,
    );
  }
});

test("presence handles unknown timestamps and sorts online, recent, then unknown users", () => {
  const render = presenceRenderer();
  for (const elapsed of [
    null,
    undefined,
    "",
    "invalid",
    "<script>alert(1)</script>",
  ]) {
    assert.equal(
      render(0, "filter", { is_active: 1, last_seen_seconds: elapsed }),
      "Last seen unavailable",
    );
  }
  const rows = [
    { is_online: 0, is_active: 1, last_seen_seconds: null },
    { is_online: 0, is_active: 1, last_seen_seconds: 7200 },
    { is_online: 1, is_active: 1, last_seen_seconds: 10 },
    { is_online: 0, is_active: 1, last_seen_seconds: 600 },
  ];
  rows.sort(
    (a, b) => render(a.is_online, "sort", a) - render(b.is_online, "sort", b),
  );
  assert.deepEqual(
    rows.map((row) => row.last_seen_seconds),
    [10, 600, 7200, null],
  );
  assert.match(
    render(1, "display", rows[0]),
    /class="user-presence online">Online/,
  );
  assert.match(
    render(0, "display", rows[1]),
    /class="user-presence offline">Last seen 10 minutes ago/,
  );
});
