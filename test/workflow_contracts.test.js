"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });

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
    "/api/subject",
    "/api/room",
    "/api/schoolyear/",
    "/api/semester/inuse/active",
  ].forEach((endpoint) =>
    assert.match(script, new RegExp(endpoint.replaceAll("/", "\\/"))),
  );
});

test("Maintenance imports refresh database lookups during validation", () => {
  const contracts = [
    ["client/maintenance/teacher/script.js", "refreshImportDepartments"],
    ["client/maintenance/course/script.js", "refreshImportDepartments"],
    ["client/maintenance/departments/script.js", "refreshImportColleges"],
    ["client/maintenance/items/script.js", "refreshImportCategories"],
    ["client/maintenance/student/script.js", "refreshImportCourses"],
  ];
  contracts.forEach(([file, refreshFunction]) => {
    const script = read(file);
    assert.match(script, new RegExp(`async function ${refreshFunction}\\(`));
    const validationCall = script.indexOf(`${refreshFunction}(),`);
    const classificationCall = script.indexOf("classifyRows(rows");
    assert.ok(validationCall >= 0, `${file} must refresh during validation`);
    assert.ok(
      validationCall < classificationCall,
      `${file} must refresh before classification`,
    );
  });
});

test("Student Course import creates missing courses and rooms", () => {
  const script = read("client/maintenance/student_subject/script.js");
  assert.match(script, /subject_needs_creation/);
  assert.match(script, /room_needs_creation/);
  assert.match(script, /["']\/api\/subject\/add["']/);
  assert.match(script, /["']\/api\/room\/add["']/);
  assert.match(script, /readImportColumn\(raw,\s*["']Description["']/);
  assert.match(script, /readImportColumn\(raw,\s*["']RoomCode["']/);
});

test("Student Course supports one rating per teacher on the same schedule for CHS", () => {
  const controller = read(
    "api/maintenance/studentsubject/studentsubject.controller.js",
  );
  const enrollmentModel = read(
    "api/maintenance/studentsubject/studentsubject.model.js",
  );
  const transactionModel = read(
    "api/transaction/studentRatingStatus/srs.model.js",
  );
  const importScript = read("client/maintenance/student_subject/script.js");
  const studentModel = read("api/maintenance/student/student.model.js");
  const serverEnrollment = read(
    "api/maintenance/serverenrollment/serverenrollment.controller.js",
  );

  assert.match(studentModel, /colleges\.code AS college/);
  assert.match(enrollmentModel, /college_code/);
  assert.match(enrollmentModel, /=== "CHS"/);
  assert.match(importScript, /isChsStudent/);
  assert.match(serverEnrollment, /row\.StudentCollegeCode/);
  assert.doesNotMatch(
    serverEnrollment,
    /is_chs:\s*normalize\(row\.CollegeCode\)/,
  );
  assert.match(controller, /subject\.schedule_code/);
  assert.match(controller, /subject\.teacher_id/);
  assert.match(enrollmentModel, /existingByEnrollment/);
  assert.match(importScript, /existingByEnrollment/);
  assert.match(
    transactionModel,
    /subject_id=\? AND teacher_id=\? AND user_id=\?/,
  );
  assert.match(
    transactionModel,
    /AND subject_id = \?\s+AND teacher_id = \?\s+AND user_id = \?/,
  );
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

test("Student rating displays teacher prefixes and suffixes", () => {
  const model = read("api/transaction/studentRatingStatus/srs.model.js");
  assert.match(model, /teachers\.prefix/);
  assert.match(model, /teachers\.suffix/);
  assert.match(model, /t\.prefix/);
  assert.match(model, /t\.suffix/);
});

test("Expired DataTable requests use the session prompt instead of an Ajax alert", () => {
  const session = read("client/auth-session.js");
  assert.match(session, /dataTable\.ext\.errMode/);
  assert.match(session, /settings\?\.jqXHR\?\.status/);
  assert.match(session, /status === 401/);
  assert.match(session, /showSessionExpiredPrompt\(\)/);
});

test("Header university branding is not navigable", () => {
  const sharedUi = read("client/shared-ui.js");
  const session = read("client/auth-session.js");
  assert.match(sharedUi, /disableHeaderBrandNavigation/);
  assert.match(sharedUi, /\.header-brand > a/);
  assert.match(sharedUi, /removeAttribute\("href"\)/);
  assert.match(sharedUi, /pointerEvents = "none"/);
  assert.doesNotMatch(session, /disableHeaderBrandNavigation/);
});

test("Admin and Room use the standard maintenance table presentation", () => {
  const admin = read("client/maintenance/admin/script.js");
  const room = read("client/maintenance/room/script.js");
  const roomPage = read("client/maintenance/room/index.html");
  assert.match(admin, /Search admin accounts/);
  assert.match(admin, /pageLength:\s*10/);
  assert.match(room, /status-badge active/);
  assert.match(room, /Search rooms/);
  assert.doesNotMatch(roomPage, /id=["']overlay["']/);
});

test("Maintenance activation and deactivation cascade through the hierarchy", () => {
  const college = read("api/maintenance/college/college.model.js");
  const department = read("api/maintenance/department/department.model.js");
  assert.match(
    college,
    /const targetActive = Number\(data\.is_active\) === 1 \? 1 : 0/,
  );
  assert.match(
    college,
    /UPDATE courses[\s\S]*SET courses\.is_active = \?[\s\S]*departments\.college_id = \?/,
  );
  assert.match(
    college,
    /UPDATE departments SET is_active = \? WHERE college_id = \?/,
  );
  assert.match(
    department,
    /UPDATE courses SET is_active = \? WHERE department_id = \?/,
  );
  assert.match(college, /targetActive \? "activated" : "deactivated"/);
  assert.match(department, /targetActive \? "activated" : "deactivated"/);
  assert.match(college, /beginTransaction/);
  assert.match(department, /beginTransaction/);
});

test("Schedule reassignment excludes teachers already assigned to the section", () => {
  const script = read("client/maintenance/schedule_assignment/script.js");
  assert.match(script, /assignedTeacherIds/);
  assert.match(script, /record\.schedule_code/);
  assert.match(script, /record\.teacher_id/);
  assert.match(script, /option\.hidden = isAssigned/);
  assert.match(script, /!option\.hidden/);
});

test("Schedule Assignment sidebar offsets the main page on desktop", () => {
  const script = read("client/maintenance/schedule_assignment/script.js");
  assert.match(script, /const main = document\.getElementById\("main"\)/);
  assert.match(script, /main\.style\.marginLeft/);
  assert.match(script, /window\.innerWidth <= 1100/);
});

test("Every non-Grad School sidebar toggle moves the main page responsively", () => {
  const scripts = walk(path.join(root, "client")).filter(
    (file) =>
      file.endsWith("script.js") &&
      !file.toLowerCase().includes("gradschool") &&
      /function toggleNav\s*\(/.test(fs.readFileSync(file, "utf8")),
  );
  assert.ok(scripts.length > 0);
  scripts.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /marginLeft|margin-left/, path.relative(root, file));
  });
});

test("Header hamburger animates without duplicating the sidebar close icon", () => {
  const sharedUi = read("client/shared-ui.js");
  const session = read("client/auth-session.js");
  assert.match(sharedUi, /installHeaderMenuAnimation/);
  assert.match(sharedUi, /satp-menu-line-top/);
  assert.match(sharedUi, /satp-menu-line-middle/);
  assert.match(sharedUi, /satp-menu-line-bottom/);
  assert.match(sharedUi, /prefers-reduced-motion/);
  assert.match(sharedUi, /requestAnimationFrame\(syncHeaderMenuState\)/);
  assert.match(sharedUi, /aria-expanded/);
  assert.doesNotMatch(session, /installHeaderMenuAnimation/);
});

test("Production deployment enforces proxy HTTPS and secure sessions", () => {
  const server = read("index.js");
  const auth = read("auth/auth_validation.js");
  const env = read(".env.example");
  const guide = read("docs/HTTPS_DEPLOYMENT.md");
  assert.match(server, /HTTPS_ONLY/);
  assert.match(server, /req\.secure/);
  assert.match(server, /res\.redirect\(308/);
  assert.match(server, /ALLOW_DIRECT_HTTP/);
  assert.match(server, /allowDirectHttp && !cameThroughProxy/);
  assert.match(server, /Strict-Transport-Security/);
  assert.match(auth, /NODE_ENV === "production"/);
  assert.match(auth, /directHttpAllowed/);
  assert.match(auth, /function setSessionCookie\(req, res, token\)/);
  assert.match(env, /TRUST_PROXY=false/);
  assert.match(env, /HTTPS_ONLY=false/);
  assert.match(env, /ALLOW_DIRECT_HTTP=false/);
  assert.match(guide, /reverse_proxy 127\.0\.0\.1:3000/);
  const ecosystem = read("ecosystem.config.cjs");
  assert.match(ecosystem, /name: "satp"/);
  assert.match(ecosystem, /script: "\.\/index\.js"/);
  assert.match(ecosystem, /NODE_ENV: "production"/);
  assert.match(guide, /pm2 start ecosystem\.config\.cjs --env production/);
  assert.match(guide, /PM2\/SATP and Caddy return automatically/);
  assert.match(guide, /Remote IP address/);
});

test("Transaction course modal remains stable across short DataTable pages", () => {
  const style = read("client/transaction/style.css");
  const script = read("client/transaction/script.js");
  assert.match(style, /\.modal-panel[\s\S]*width: 750px[\s\S]*height: 720px/);
  assert.match(
    style,
    /\.modal-table-shell #modalTable_wrapper[\s\S]*height: 100%/,
  );
  assert.match(
    style,
    /#modalTable_wrapper \.dataTables_paginate[\s\S]*margin-top: auto/,
  );
  assert.match(script, /pageLength: 8/);
  assert.match(script, /#subjectModal \.modal-body/);
  assert.match(script, /modalBody\.scrollTop = 0/);
  assert.match(script, /type === "sort" \|\| type === "type"/);
  assert.match(script, /return isRated \? 1 : 0/);
});

test("Activity Log search accepts student ID numbers", () => {
  const model = read("api/user/activity_log/log.model.js");
  const script = read("client/user/activity_log/script.js");
  const migration = read(
    "database/migrations/2026-08-12_users_username_index.sql",
  );
  assert.match(model, /SELECT id FROM users WHERE username = \? LIMIT 1/);
  assert.match(model, /filter \+= " AND a\.user_id = \?"/);
  assert.doesNotMatch(model, /JOIN users AS account/);
  assert.match(migration, /ADD INDEX idx_users_username \(username\)/);
  assert.match(script, /Search ID, user, or activity/);
});

test("Empty Select and Choose dropdown prompts cannot be selected", () => {
  const sharedUi = read("client/shared-ui.js");
  const session = read("client/auth-session.js");
  assert.match(sharedUi, /function disableSelectPlaceholders/);
  assert.match(sharedUi, /\^\(select\|choose\)\\b/i);
  assert.match(sharedUi, /option\.value === "" && isPrompt/);
  assert.match(sharedUi, /option\.disabled = true/);
  assert.match(
    sharedUi,
    /disableSelectPlaceholders\(node\.parentElement \|\| node\)/,
  );
  assert.doesNotMatch(session, /disableSelectPlaceholders/);

  const authenticatedPages = walk(path.join(root, "client")).filter((file) => {
    if (!file.endsWith(".html") || file.toLowerCase().includes("gradschool"))
      return false;
    return fs.readFileSync(file, "utf8").includes("/auth-session.js");
  });
  authenticatedPages.forEach((file) => {
    const html = fs.readFileSync(file, "utf8");
    assert.match(
      html,
      /<script src="\/shared-ui\.js"><\/script>/,
      path.relative(root, file),
    );
  });
});

test("Grad School remains excluded from automated page and server QA", () => {
  assert.match(
    read("test/pages.smoke.test.js"),
    /includes\(["']gradschool["']\)/,
  );
  assert.match(
    read("test/server.smoke.test.js"),
    /includes\(["']gradschool["']\)/,
  );
});
