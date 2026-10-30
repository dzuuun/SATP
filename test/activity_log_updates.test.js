"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const call = (fn, ...args) =>
  new Promise((resolve, reject) =>
    fn(...args, (error, result) => (error ? reject(error) : resolve(result))),
  );
function load(file, mocks) {
  const module = { exports: {} };
  vm.runInNewContext(read(file), {
    module,
    require: (name) => mocks[name],
    console,
  });
  return module.exports;
}
function modelWith(query) {
  return load("api/user/activity_log/log.model.js", {
    "../../../db/db": { query },
  });
}

test("table snapshots use a precise global cursor even for empty results or later pages", async () => {
  const queries = [];
  const cursor = "9007199254740995";
  const model = modelWith((sql, params, done) => {
    queries.push({ sql, params: Array.from(params) });
    if (sql.includes("AS latest_id")) done(null, [{ latest_id: cursor }]);
    else if (sql.includes("COUNT(*)")) done(null, [{ total: 0 }]);
    else done(null, []);
  });
  const result = await call(model.getLog, 30, 15, "", 2026);
  assert.equal(result.latestId, cursor);
  const page = queries.find(({ sql }) => sql.includes("ORDER BY a.id DESC"));
  assert.match(page.sql, /a\.id <= \?/);
  assert.deepEqual(page.params.slice(-3), [cursor, 30, 15]);
});

test("new-entry counts use the selected year and the same student-ID or text search as the table", async () => {
  const queries = [];
  const model = modelWith((sql, params, done) => {
    queries.push({ sql, params: Array.from(params) });
    done(
      null,
      sql.includes("SELECT id FROM users")
        ? params[0] === "2026056"
          ? [{ id: 88 }]
          : []
        : [{ new_entries: 3 }],
    );
  });
  for (let i = 0; i < 2; i++) {
    assert.equal(
      (await call(model.getNewEntries, "123", "2026056", 2026)).new_entries,
      3,
    );
  }
  const idCounts = queries.filter(({ sql }) => sql.includes("COUNT(*)"));
  assert.equal(idCounts.length, 2);
  assert.match(idCounts[0].sql, /a\.user_id = \?/);
  assert.match(idCounts[0].sql, /a\.id > \?/);
  assert.deepEqual(idCounts[0].params, [
    "2026-01-01 00:00:00",
    "2027-01-01 00:00:00",
    88,
    "123",
  ]);
  await call(model.getNewEntries, "123", "Logged out", 2025);
  assert.deepEqual(queries.at(-1).params, [
    "2025-01-01 00:00:00",
    "2026-01-01 00:00:00",
    "%Logged out%",
    "%Logged out%",
    "123",
  ]);
});

test("detecting new entries invalidates cached totals before the user refreshes", async () => {
  let totalReads = 0;
  let yearReads = 0;
  const model = modelWith((sql, _params, done) => {
    if (sql.includes("AS latest_id")) return done(null, [{ latest_id: "10" }]);
    if (sql.includes("GROUP BY YEAR")) {
      yearReads++;
      return done(null, [{ year: 2026, total: 10 }]);
    }
    if (sql.includes("AS new_entries")) return done(null, [{ new_entries: 2 }]);
    if (sql.includes("COUNT(*)")) {
      totalReads++;
      return done(null, [{ total: 10 }]);
    }
    done(null, []);
  });
  await call(model.getLog, 0, 15, "", 2026);
  await call(model.getYears);
  await call(model.getLog, 0, 15, "", 2026);
  assert.equal(totalReads, 1);
  await call(model.getNewEntries, "10", "", 2026);
  await call(model.getLog, 0, 15, "", 2026);
  await call(model.getYears);
  assert.equal(totalReads, 2);
  assert.equal(yearReads, 2);
});

test("update endpoint rejects invalid cursors and preserves full unsigned bigint IDs", () => {
  const calls = [];
  const controller = load("api/user/activity_log/log.controller.js", {
    "./log.model": {
      getNewEntries: (...args) => {
        calls.push(args);
        args.at(-1)(null, { new_entries: 2 });
      },
    },
  });
  const response = () => ({
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(body) {
      this.body = body;
      return this;
    },
  });
  for (const after_id of [
    undefined,
    "-1",
    "1 OR 1=1",
    "1.2",
    "18446744073709551616",
  ]) {
    const res = response();
    controller.getNewEntries({ query: { after_id } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(calls.length, 0);
  const res = response();
  controller.getNewEntries(
    {
      query: {
        after_id: "18446744073709551615",
        year: "2026",
        search: " test ",
      },
    },
    res,
  );
  assert.equal(calls[0][0], "18446744073709551615");
  assert.equal(calls[0][1], "test");
  assert.equal(calls[0][2], 2026);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.body.data.new_entries, 2);
});

function activityPage() {
  const fields = new Map();
  const field = (id) => {
    if (!fields.has(id))
      fields.set(id, {
        value: "",
        hidden: true,
        disabled: false,
        textContent: "",
        listeners: {},
        addEventListener(name, fn) {
          this.listeners[name] = fn;
        },
      });
    return fields.get(id);
  };
  field("activityYear").value = "2026";
  const handlers = {};
  const table = {
    reloads: [],
    pages: [],
    page(value) {
      this.pages.push(value);
      return this;
    },
  };
  table.ajax = { reload: (...args) => table.reloads.push(args) };
  let config;
  const wrapper = {
    on(name, fn) {
      handlers[name] = fn;
      return this;
    },
    DataTable(options) {
      config = options;
      return table;
    },
  };
  const jquery = () => wrapper;
  jquery.fn = { dataTable: { render: { text: () => (value) => value } } };
  const document = {
    title: "SATP | Activity Log",
    visibilityState: "visible",
    getElementById: field,
    addEventListener() {},
  };
  const requests = [];
  const timers = new Map();
  let timerId = 0;
  const context = vm.createContext({
    document,
    $: jquery,
    URLSearchParams,
    localStorage: { getItem: () => "1" },
    setInterval(callback, interval) {
      timers.set(++timerId, { callback, interval });
      return timerId;
    },
    clearInterval(id) {
      timers.delete(id);
    },
    fetch: async (url) => {
      requests.push(url);
      return {
        ok: true,
        json: async () => ({ success: 1, data: { new_entries: 3 } }),
      };
    },
  });
  const source = read("client/user/activity_log/script.js");
  vm.runInContext(
    source.slice(0, source.indexOf("function toggleNav(")),
    context,
  );
  const request = (draw, search = "") =>
    config.ajax.data({ draw, search: { value: search } });
  const receive = (draw, cursor) =>
    config.ajax.dataSrc({ draw, latest_id: cursor, data: [] });
  return {
    field,
    table,
    context,
    document,
    requests,
    request,
    receive,
    handlers,
    timers,
  };
}

test("background checks show a count without reloading, and clicking loads the first page", async () => {
  const page = activityPage();
  page.request(1);
  page.receive(1, "123");
  await page.context.checkNewActivity();
  assert.equal(page.field("activityUpdates").hidden, false);
  assert.equal(page.field("newActivityCount").textContent, "3 new entries");
  assert.equal(page.table.reloads.length, 0);
  await page.context.checkNewActivity();
  assert.ok(
    page.requests.every(
      (url) => new URLSearchParams(url.split("?")[1]).get("after_id") === "123",
    ),
  );
  page.field("showNewActivity").listeners.click();
  assert.deepEqual(page.table.pages, ["first"]);
  assert.deepEqual(page.table.reloads, [[null, true]]);
  page.request(2);
  page.receive(2, "126");
  assert.equal(page.field("activityUpdates").hidden, true);
  await page.context.checkNewActivity();
  assert.equal(
    new URLSearchParams(page.requests.at(-1).split("?")[1]).get("after_id"),
    "126",
  );
});

test("stale polls and out-of-order table responses cannot overwrite a changed year or search", async () => {
  const page = activityPage();
  page.request(1);
  page.receive(1, "10");
  let finish;
  page.context.fetch = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = page.context.checkNewActivity();
  page.field("activityYear").value = "2025";
  page.request(2, "Alice");
  page.receive(2, "20");
  page.receive(1, "10");
  finish({
    ok: true,
    json: async () => ({ success: 1, data: { new_entries: 9 } }),
  });
  await pending;
  assert.equal(page.field("activityUpdates").hidden, true);
  let query;
  page.context.fetch = async (url) => {
    query = new URLSearchParams(url.split("?")[1]);
    return {
      ok: true,
      json: async () => ({ success: 1, data: { new_entries: 1 } }),
    };
  };
  await page.context.checkNewActivity();
  assert.equal(query.get("year"), "2025");
  assert.equal(query.get("search"), "Alice");
  assert.equal(query.get("after_id"), "20");
  assert.equal(page.field("newActivityCount").textContent, "1 new entry");
});

test("checks wait for an initial snapshot, run in hidden tabs, and retain notices on network failures", async () => {
  const page = activityPage();
  await page.context.checkNewActivity();
  assert.equal(page.requests.length, 0);
  page.request(1);
  page.receive(1, "0");
  page.document.visibilityState = "hidden";
  await page.context.checkNewActivity();
  assert.equal(page.requests.length, 1);
  assert.equal(page.document.title, "3 new entries | SATP | Activity Log");
  page.document.visibilityState = "visible";
  await page.context.checkNewActivity();
  page.context.fetch = async () => {
    throw new Error("offline");
  };
  await page.context.checkNewActivity();
  assert.equal(page.field("activityUpdates").hidden, false);
  assert.equal(page.field("newActivityCount").textContent, "3 new entries");
});

test("tab title flashes the current count without duplicate timers and restores after records load", async () => {
  const page = activityPage();
  page.request(1);
  page.receive(1, "10");
  await page.context.checkNewActivity();
  const flashTimers = () =>
    [...page.timers.values()].filter((timer) => timer.interval === 1000);
  assert.equal(flashTimers().length, 1);
  assert.equal(page.document.title, "3 new entries | SATP | Activity Log");
  flashTimers()[0].callback();
  assert.equal(page.document.title, "SATP | Activity Log");
  flashTimers()[0].callback();
  assert.equal(page.document.title, "3 new entries | SATP | Activity Log");
  await page.context.checkNewActivity();
  assert.equal(flashTimers().length, 1);
  page.context.fetch = async () => ({
    ok: true,
    json: async () => ({ success: 1, data: { new_entries: 5 } }),
  });
  await page.context.checkNewActivity();
  assert.equal(page.document.title, "5 new entries | SATP | Activity Log");
  assert.equal(flashTimers().length, 1);
  page.request(2);
  page.handlers["xhr.dt"]({}, null, null);
  assert.equal(flashTimers().length, 1);
  page.receive(2, "15");
  assert.equal(flashTimers().length, 0);
  assert.equal(page.document.title, "SATP | Activity Log");
});

test("one new entry uses singular wording and a zero count stops title flashing", async () => {
  const page = activityPage();
  page.request(1);
  page.receive(1, "10");
  let count = 1;
  page.context.fetch = async () => ({
    ok: true,
    json: async () => ({ success: 1, data: { new_entries: count } }),
  });
  await page.context.checkNewActivity();
  assert.equal(page.document.title, "1 new entry | SATP | Activity Log");
  count = 0;
  await page.context.checkNewActivity();
  assert.equal(page.document.title, "SATP | Activity Log");
  assert.equal(
    [...page.timers.values()].filter((timer) => timer.interval === 1000).length,
    0,
  );
});
