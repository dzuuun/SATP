"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function transactionPage() {
  const source = fs.readFileSync(
    path.join(__dirname, "../client/transaction/script.js"),
    "utf8",
  );
  const fields = new Map();
  const field = (id) => {
    if (!fields.has(id))
      fields.set(id, {
        value: "",
        textContent: "",
        classList: { toggle() {}, remove() {} },
        querySelector: (selector) => field(`${id}:${selector}`),
      });
    return fields.get(id);
  };
  field("loadSchoolYear").value = "4";
  field("loadSemester").value = "2";
  const table = {
    data: [],
    currentPage: 0,
    draws: [],
    searchTerm: "Student",
    sort: [[1, "asc"]],
    clear() {
      this.data = [];
      return this;
    },
    draw(reset) {
      this.draws.push(reset);
      if (reset === true) this.currentPage = 0;
      return this;
    },
  };
  table.rows = {
    add(rows) {
      table.data = rows;
      return table;
    },
  };
  table.page = (value) => {
    if (value === undefined) return table.currentPage;
    table.currentPage = value;
    return table;
  };
  table.page.info = () => ({ pages: Math.ceil(table.data.length / 10) });
  let rows = [{ IDNumber: "100", PendingStatusCount: 1, TotalSubjects: 2 }];
  let stats = { TotalStudents: 1, FullyRatedCount: 0, IncompleteCount: 1 };
  let fail = false;
  let deferNext = false;
  let finish;
  let signedIn = true;
  const requests = [];
  const events = {};
  const timers = [];
  const effects = { shown: 0, hidden: 0, toasts: 0 };
  const document = {
    visibilityState: "visible",
    getElementById: field,
    querySelector: () => ({ textContent: "Test term" }),
    addEventListener(name, handler) {
      events[name] = handler;
    },
  };
  const context = vm.createContext({
    document,
    window: {
      addEventListener(name, handler) {
        events[name] = handler;
      },
    },
    localStorage: {
      getItem: (key) =>
        key === "adminAcademicScope" ? "ALL" : signedIn ? "1" : null,
    },
    mainTable: table,
    setInterval(callback, interval) {
      timers.push({ callback, interval });
    },
    showSpinner() {
      effects.shown++;
    },
    hideSpinner() {
      effects.hidden++;
    },
    showToast() {
      effects.toasts++;
    },
    alert: () => assert.fail("Unexpected missing-filter alert"),
    fetch: async (url, options) => {
      requests.push({ url, options });
      const isStats = url.includes("/stats/");
      const response = {
        ok: !fail,
        json: async () => ({
          success: fail ? 0 : 1,
          message: "Test request failed",
          data: isStats ? [stats] : rows,
        }),
      };
      if (!isStats && deferNext) {
        deferNext = false;
        return new Promise((resolve) => {
          finish = () => resolve(response);
        });
      }
      return response;
    },
  });
  vm.runInContext(
    source.slice(0, source.indexOf("function renderRatingAccess(")) +
      "\nglobalThis.api = API; globalThis.viewState = state;",
    context,
  );
  return {
    context,
    field,
    document,
    table,
    requests,
    events,
    timers,
    effects,
    load: () =>
      context.api.loadData({
        school_year_id: field("loadSchoolYear").value,
        semester_id: field("loadSemester").value,
      }),
    data: (nextRows, nextStats = stats) => {
      rows = nextRows;
      stats = nextStats;
    },
    fail: (value) => {
      fail = value;
    },
    signOut: () => {
      signedIn = false;
    },
    defer: () => {
      deferNext = true;
    },
    finish: () => finish(),
  };
}

test("live updates add records and update summaries without a spinner, page reset, search reset or sort reset", async () => {
  const page = transactionPage();
  await page.load();
  const rows = Array.from({ length: 35 }, (_, id) => ({
    IDNumber: String(id),
    PendingStatusCount: 0,
    TotalSubjects: 2,
  }));
  page.table.currentPage = 2;
  page.data(rows, {
    TotalStudents: 35,
    FullyRatedCount: 35,
    IncompleteCount: 0,
  });
  await page.context.refreshTransactions();
  assert.equal(page.table.data.length, 35);
  assert.equal(page.field("totalTransactions").textContent, 35);
  assert.equal(page.field("TransactionsAccomplished").textContent, 35);
  assert.equal(page.table.currentPage, 2);
  assert.equal(page.table.searchTerm, "Student");
  assert.deepEqual(page.table.sort, [[1, "asc"]]);
  assert.equal(page.table.draws.at(-1), false);
  assert.deepEqual(page.effects, { shown: 1, hidden: 1, toasts: 0 });
  assert.ok(page.requests.every(({ options }) => options.cache === "no-store"));
  assert.equal(page.timers[0].interval, 5000);
});

test("unchanged snapshots do not redraw and rating-status changes trigger an update", async () => {
  const page = transactionPage();
  await page.load();
  await page.context.refreshTransactions();
  assert.equal(page.table.draws.length, 1);
  page.data([{ IDNumber: "100", PendingStatusCount: 0, TotalSubjects: 2 }], {
    TotalStudents: 1,
    FullyRatedCount: 1,
    IncompleteCount: 0,
  });
  await page.context.refreshTransactions();
  assert.equal(page.table.draws.length, 2);
  assert.equal(page.table.data[0].PendingStatusCount, 0);
  assert.equal(page.field("TransactionsAccomplished").textContent, 1);
});

test("changed dropdowns pause updates until explicitly loaded, even if the user returns to the old selection", async () => {
  const page = transactionPage();
  await page.context.refreshTransactions();
  assert.equal(page.requests.length, 0);
  await page.load();
  page.field("loadSemester").value = "3";
  page.context.invalidateTransactionLoad();
  await page.context.refreshTransactions();
  assert.equal(page.requests.length, 2);
  page.field("loadSemester").value = "2";
  await page.context.refreshTransactions();
  assert.equal(page.requests.length, 2);
  assert.equal(page.field("btnSearch:span").textContent, "Load records");
  await page.load();
  await page.context.refreshTransactions();
  assert.equal(page.requests.length, 6);
  assert.equal(page.field("btnSearch:span").textContent, "Refresh");
});

test("overlapping checks are skipped and a late response cannot replace a newly loaded term", async () => {
  const page = transactionPage();
  await page.load();
  page.defer();
  const old = page.context.refreshTransactions();
  await page.context.refreshTransactions();
  assert.equal(page.requests.length, 4);
  page.field("loadSemester").value = "3";
  page.context.invalidateTransactionLoad();
  page.data([
    { IDNumber: "new-term", PendingStatusCount: 0, TotalSubjects: 1 },
  ]);
  await page.load();
  page.finish();
  await old;
  assert.equal(page.context.viewState.semester_id, "3");
  assert.equal(page.table.data[0].IDNumber, "new-term");
  assert.equal(page.context.viewState.loadingRecords, false);
});

test("background errors retain data and retry, while removals clamp the page to a valid one", async () => {
  const page = transactionPage();
  await page.load();
  page.fail(true);
  await page.context.refreshTransactions();
  assert.equal(page.table.data[0].IDNumber, "100");
  assert.equal(page.effects.toasts, 0);
  assert.equal(page.context.viewState.loadingRecords, false);
  page.fail(false);
  page.table.currentPage = 3;
  page.data([], { TotalStudents: 0, FullyRatedCount: 0, IncompleteCount: 0 });
  await page.context.refreshTransactions();
  assert.equal(page.table.data.length, 0);
  assert.equal(page.table.currentPage, 0);
  assert.equal(page.field("totalTransactions").textContent, 0);
  assert.equal(page.field("btnSearch:span").textContent, "Refresh");
});

test("hidden and signed-out pages stop checks; returning to the tab refreshes immediately", async () => {
  const page = transactionPage();
  await page.load();
  page.document.visibilityState = "hidden";
  await page.context.refreshTransactions();
  assert.equal(page.requests.length, 2);
  page.document.visibilityState = "visible";
  page.events.visibilitychange();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(page.requests.length, 4);
  page.signOut();
  await page.context.refreshTransactions();
  assert.equal(page.requests.length, 4);
});
