"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Student Course refreshes database references before workbook classification", () => {
  const script = read("client/maintenance/student_subject/script.js");
  const refreshCall = script.indexOf("await refreshWorkbookReferences()");
  const parseCall = script.indexOf("await parseWorkbook(selectedFile)");
  const classifyCall = script.indexOf("await classifySubjectRows(rows)");
  assert.ok(refreshCall >= 0, "database refresh call is required");
  assert.ok(refreshCall < parseCall && parseCall < classifyCall);
  [
    "/api/student",
    "/api/teacher",
    "/api/subject/all/active",
    "/api/room/all/active",
    "/api/schoolyear/",
    "/api/semester/inuse/active",
  ].forEach((endpoint) => assert.match(script, new RegExp(endpoint.replaceAll("/", "\\/"))));
});

test("User Management exposes username deactivation upload end to end", () => {
  const html = read("client/user/user_management/index.html");
  const script = read("client/user/user_management/script.js");
  const router = read("api/user/user_management/user_management.router.js");
  [
    "deactivateImportModal",
    "deactivateImportForm",
    "deactivateXlsxInput",
    "downloadDeactivateTemplate",
  ].forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`)));
  assert.match(script, /prepareImport\(event,\s*["']deactivate["']\)/);
  assert.match(script, /\/api\/user\/bulk\/deactivate/);
  assert.match(router, /router\.put\(["']\/bulk\/deactivate["']/);
});

test("Student Maintenance exposes a filtered XLSX export with username", () => {
  const html = read("client/maintenance/student/index.html");
  const script = read("client/maintenance/student/script.js");
  assert.match(html, /id=["']exportStudentsButton["']/);
  assert.match(script, /rows\(\{\s*search:\s*["']applied["']\s*\}\)/);
  assert.match(script, /Username:\s*student\.username/);
  assert.match(script, /XLSX\.writeFile/);
});

test("Student rating access is separated for SHS and non-SHS students", () => {
  const html = read("client/transaction/index.html");
  const script = read("client/transaction/script.js");
  const model = read("api/transaction/studentRatingStatus/srs.model.js");
  ["shsRatingAccessToggle", "nonShsRatingAccessToggle"].forEach((id) =>
    assert.match(html, new RegExp(`id=["']${id}["']`)),
  );
  assert.match(script, /["']shsRatingAccessToggle["'],\s*["']shs["']/);
  assert.match(script, /["']nonShsRatingAccessToggle["'],\s*["']non_shs["']/);
  assert.match(model, /student_rating_shs_enabled/);
  assert.match(model, /student_rating_non_shs_enabled/);
  assert.match(model, /departments\.code/);
});

test("Grad School remains excluded from automated page and server QA", () => {
  assert.match(read("test/pages.smoke.test.js"), /includes\(["']gradschool["']\)/);
  assert.match(read("test/server.smoke.test.js"), /includes\(["']gradschool["']\)/);
});
