"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { waitForBrowserPort } = require("../api/reports/rating/browser_port");

test("Chrome startup tolerates Windows locks and partial port files", async () => {
  const values = [
    "ENOENT",
    "EBUSY",
    "EACCES",
    "EPERM",
    "",
    "123",
    "70000\n/devtools/browser/id",
    "12345\r\n/devtools/browser/id\r\n",
  ];
  let reads = 0;
  const port = await waitForBrowserPort("unused", () => null, {
    read: async () => {
      const value = values[reads++];
      if (value.startsWith("E"))
        throw Object.assign(new Error(value), { code: value });
      return value;
    },
    wait: async () => {},
  });
  assert.equal(port, 12345);
  assert.equal(reads, values.length);
});

test("Chrome startup retries are bounded and permanent failures stop immediately", async () => {
  let reads = 0;
  await assert.rejects(
    waitForBrowserPort("unused", () => null, {
      read: async () => {
        reads++;
        throw Object.assign(new Error("locked"), { code: "EBUSY" });
      },
      wait: async () => {},
      attempts: 3,
    }),
    /stayed locked/,
  );
  assert.equal(reads, 3);
  await assert.rejects(
    waitForBrowserPort("unused", () => new Error("Browser exited")),
    /Browser exited/,
  );
  await assert.rejects(
    waitForBrowserPort("unused", () => null, {
      read: async () => {
        throw Object.assign(new Error("disk failure"), { code: "EIO" });
      },
    }),
    /disk failure/,
  );
});
