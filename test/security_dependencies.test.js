"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { spawnSync } = require("node:child_process");
const express = require("express");
const multer = require("multer");
const nodeRuntime = require("../scripts/node-runtime");

test("SATP launcher selects the patched Node.js 24 runtime", () => {
  const result = spawnSync(nodeRuntime(), ["-p", "process.versions.node"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  const [major, minor, patch] = result.stdout.trim().split(".").map(Number);
  assert.equal(major, 24);
  assert.ok(minor > 22 || (minor === 22 && patch >= 1));
  assert.doesNotThrow(() => nodeRuntime.assertCurrent());
});

test("patched Multer accepts uploads and survives malformed multipart requests", async (t) => {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage() });
  app.post("/upload", upload.single("image"), (req, res) => {
    res.json({ name: req.file.originalname, contents: req.file.buffer.toString() });
  });
  app.use((error, _req, res, _next) => res.status(400).json({ error: error.message }));
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/upload`;
  const malformed = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data; boundary=unfinished" },
    body: '--unfinished\r\nContent-Disposition: form-data; name="image"; filename="test.txt"\r\n\r\nincomplete',
  });
  assert.equal(malformed.status, 400);
  await malformed.json();
  const form = new FormData();
  form.append("image", new Blob(["upload works"]), "test.txt");
  const valid = await fetch(url, { method: "POST", body: form });
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { name: "test.txt", contents: "upload works" });
});
