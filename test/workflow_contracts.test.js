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
  const classifyCall = script.indexOf(
    "await classifySubjectRows(rows, schoolId)",
  );
  assert.ok(refreshCall >= 0, "database refresh call is required");
  assert.ok(refreshCall < parseCall && parseCall < classifyCall);
  [
    "/api/student",
    "/api/teacher",
    "/api/subject",
    "/api/room",
    "/api/schoolyear/",
    "/api/semester/all/active",
    "/api/department/all/active",
    "/api/school/all/active",
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
  const ratingModel = read(
    "api/transaction/studentRatingStatus/srs.model.js",
  );
  const importScript = read("client/maintenance/student_subject/script.js");
  const studentModel = read("api/maintenance/student/student.model.js");
  const ratingClient = read("client/rate/script.js");
  const schema = read("db.sql");

  assert.match(studentModel, /colleges\.code AS college/);
  assert.match(enrollmentModel, /college_code/);
  assert.match(enrollmentModel, /=== "CHS"/);
  assert.match(importScript, /isChsStudent/);
  assert.match(
    importScript,
    /normalizeImportValue\(student\?\.college\) === "chs"/,
  );
  assert.doesNotMatch(importScript, /normalizeImportValue\(raw\.CollegeCode\)/);
  assert.match(controller, /subject\.schedule_code/);
  assert.match(controller, /subject\.teacher_id/);
  assert.match(enrollmentModel, /existingByEnrollment/);
  assert.match(importScript, /existingByEnrollment/);
  assert.match(
    schema,
    /UNIQUE KEY `uq_arc_student_course_teacher_schedule` \(`student_id`,`school_year_id`,`semester_id`,`subject_id`,`teacher_id`,`schedule_code`\)/,
  );
  assert.match(ratingClient, /academic_record_id: state\.recordId/);
  assert.match(ratingModel, /WHERE academic_records_consolidated\.id = \?/);
  assert.match(
    ratingModel,
    /Number\(records\[0\]\.student_id\) !== Number\(data\.user_id\)/,
  );
  assert.match(ratingModel, /return saveRatings\(records\[0\]\.id\)/);
  assert.match(
    ratingModel,
    /INSERT INTO trans_item \(transaction_id, item_id, rate\) VALUES \?/,
  );
  assert.doesNotMatch(importScript, /confirmGenerateTransaction/);
  assert.doesNotMatch(enrollmentModel, /UPDATE transactions AS transactions/);
});

test("Student Course import indexes validation data and uses bounded concurrency", () => {
  const script = read("client/maintenance/student_subject/script.js");
  const style = read("client/maintenance/student_subject/style.css");

  assert.match(script, /const recordsByStudent = new Map\(\)/);
  assert.match(script, /recordsByStudent\.get\(Number\(sample\.student_id\)\)/);
  assert.match(script, /const IMPORT_CONCURRENCY = 6/);
  assert.match(
    script,
    /length: Math\.min\(IMPORT_CONCURRENCY, groupEntries\.length\)/,
  );
  assert.match(script, /await processGroup\(groupEntries\[index\]\)/);
  assert.match(script, /if \(!response\.ok\)[\s\S]*created \+=/);
  assert.match(
    script,
    /Checking row \$\{Math\.min\(index \+ 1, rows\.length\)\} of \$\{rows\.length\};\\n\$\{remaining\} remaining\./,
  );
  assert.match(style, /#spinnerStatusModalCard #progressDetail[\s\S]*white-space: pre-line/);
});

test("Student Course validation progress is throttled and completes after preview rendering", () => {
  const script = read("client/maintenance/student_subject/script.js");

  assert.match(script, /Math\.ceil\(rows\.length \/ 40\)/);
  assert.match(script, /10 \+ Math\.round\(\(processed \/ rows\.length\) \* 55\)/);
  assert.match(script, /65 \+ Math\.floor\(\(checkedBatches \/ enrollmentBatches\.length\) \* 30\)/);
  assert.match(
    script,
    /const shouldReportProgress =\s*progress > lastEnrollmentProgress \|\| remaining === 0/,
  );
  assert.match(
    script,
    /renderSubjectImportPreview\(\);[\s\S]*?"Validation complete",\s*"100%"/,
  );
  assert.match(script, /document\.createDocumentFragment\(\)/);
});

test("Student Course validation yields work and batches large previews", () => {
  const script = read("client/maintenance/student_subject/script.js");
  const style = read("client/maintenance/student_subject/style.css");

  assert.match(script, /function yieldToMainThread\(\)/);
  assert.match(script, /processed % 250 === 0/);
  assert.match(script, /checkedBatches % 200 === 0/);
  assert.match(script, /const periodSamples = new Map\(\)/);
  assert.match(script, /const periodRecords = new Map\(\)/);
  assert.doesNotMatch(script, /enrollmentBatches\.map\(async \(items\)/);
  assert.match(script, /const PREVIEW_BATCH_SIZE = 250/);
  assert.match(script, /\.slice\(visibleCount, visibleCount \+ PREVIEW_BATCH_SIZE\)/);
  assert.match(style, /\.preview-load-more/);
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
  assert.match(script, /username:\s*student\.username/);
  assert.match(script, /password:\s*["']["']/);
  assert.match(script, /google_email:\s*student\.google_email/);
  assert.match(script, /course_code:\s*student\.course/);
  assert.match(script, /year_level:\s*formatYearLevel\(student\.year_level\)/);
  assert.match(script, /1:\s*["']1st Year["']/);
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
  assert.match(model, /schools\.code/);
});

test("SHS and College use independent current academic terms", () => {
  const migration = read("database/migrations/2026-08-13_separate_shs_college_terms.sql");
  const semesterModel = read("api/maintenance/semester/semester.model.js");
  const schoolYearModel = read("api/maintenance/schoolyear/schoolyear.model.js");
  const semesterRouter = read("api/maintenance/semester/semester.router.js");
  const rating = read("client/rating/script.js");
  const studentCourse = read("client/maintenance/student_subject/script.js");
  const semesterPage = read("client/maintenance/semester/index.html");
  assert.match(migration, /is_current_college/);
  assert.match(migration, /is_current_shs/);
  assert.match(semesterModel, /schools\.code\)\) = 'SHS'/);
  assert.match(semesterModel, /semesters\.is_current_shs = 1/);
  assert.match(semesterModel, /semesters\.is_current_college = 1/);
  assert.match(schoolYearModel, /UPDATE school_years SET in_use = 0/);
  assert.match(schoolYearModel, /isActive && Number\(data\.in_use\) === 1/);
  assert.match(semesterRouter, /router\.get\("\/current\/student", getCurrentSemesterForStudent\)/);
  assert.match(rating, /\/api\/semester\/current\/student/);
  assert.match(studentCourse, /\/api\/semester\/current\/admin/);
  assert.match(studentCourse, /Number\(currentData\.data\?\.id\)/);
  assert.doesNotMatch(studentCourse, /activeSemesters\.find/);
  assert.doesNotMatch(
    studentCourse,
    /const currentSemester = rows[\s\S]{0,180}Number\(b\.id\) - Number\(a\.id\)/,
  );
  assert.match(semesterPage, /Current for College/);
  assert.match(semesterPage, /Current for SHS/);
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
  assert.match(college, /SELECT is_active FROM colleges WHERE id = \? FOR UPDATE/);
  assert.match(department, /SELECT is_active FROM departments WHERE id = \? FOR UPDATE/);
  assert.match(college, /if \(statusChanged\) \{/);
  assert.match(department, /if \(statusChanged\) \{/);
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

test("Schedule Assignment uses the period index before resolving academic scope", () => {
  const model = read("api/maintenance/studentsubject/studentsubject.model.js");
  assert.match(model, /SELECT STRAIGHT_JOIN arc\.school_year_id/);
  assert.match(
    model,
    /arc\.school_year_id = \? AND arc\.semester_id = \?[\s\S]*requesting_admin\.admin_academic_scope = CASE[\s\S]*student_schools\.code/,
  );
  assert.match(model, /arc\.schedule_code IS NOT NULL AND arc\.schedule_code <> ''/);
});

test("Schedule Assignment can dissolve and restore a schedule", () => {
  const model = read("api/maintenance/studentsubject/studentsubject.model.js");
  const controller = read("api/maintenance/studentsubject/studentsubject.controller.js");
  const router = read("api/maintenance/studentsubject/studentsubject.router.js");
  const script = read("client/maintenance/schedule_assignment/script.js");
  assert.match(router, /schedule-assignments\/dissolve/);
  assert.match(controller, /setScheduleDissolved/);
  assert.match(model, /SET arc\.is_excluded = 1, arc\.reason = 'DISSOLVED'/);
  assert.match(model, /SET arc\.is_excluded = 0, arc\.reason = NULL/);
  assert.match(model, /arc\.schedule_code = \? AND arc\.reason = 'DISSOLVED'/);
  assert.match(model, /beginTransaction/);
  assert.match(script, /section-dissolve-button/);
  assert.match(script, /dissolved: !dissolved/);
  assert.match(script, /Restore/);
  const style = read("client/maintenance/schedule_assignment/style.css");
  assert.match(style, /\.schedule-status[\s\S]*white-space: nowrap/);
  assert.match(style, /\.schedule-actions[\s\S]*min-width: 190px/);
  assert.match(style, /#table \{ min-width: 980px; \}/);
});

test("Schedule Assignment confirms actions with an app modal", () => {
  const page = read("client/maintenance/schedule_assignment/index.html");
  const script = read("client/maintenance/schedule_assignment/script.js");
  assert.match(page, /id="confirmActionModal"/);
  assert.match(page, /id="confirmActionMessage"/);
  assert.match(script, /confirmScheduleAction/);
  assert.match(script, /resolveActionConfirmation/);
  assert.doesNotMatch(script, /\bconfirm\s*\(/);
});

test("Excluded rated enrollments do not count in report scores", () => {
  const rating = read("api/reports/rating/rating.model.js");
  const ranking = read("api/reports/ranking/ranking.model.js");
  assert.match(rating, /AND arc\.is_excluded = 0/);
  assert.match(rating, /AND is_excluded = 0/);
  const ratingFilters = rating.match(/arc\.is_excluded = 0/g) || [];
  assert.ok(ratingFilters.length >= 10);
  const rankingJoins = ranking.match(/trans_item\.transaction_id = arc\.id/g) || [];
  assert.equal(rankingJoins.length, 4);
  assert.doesNotMatch(ranking, /\btransactions\b/);
  assert.match(ranking, /UPPER\(TRIM\(student_schools\.code\)\) <> 'SHS'/);
  assert.match(ranking, /UPPER\(TRIM\(student_schools\.code\)\) = 'SHS'/);
});

test("Excluded courses are hidden from rating lists and transaction totals", () => {
  const model = read("api/transaction/studentRatingStatus/srs.model.js");
  const filters = model.match(/COALESCE\((?:academic_records_consolidated\.)?(?:ar\.)?is_excluded, 0\) = 0/g) || [];
  assert.ok(filters.length >= 6);
  assert.match(model, /COUNT\(academic_records_consolidated\.subject_id\) AS TotalSubjects[\s\S]*COALESCE\(academic_records_consolidated\.is_excluded, 0\) = 0/);
  assert.match(
    model,
    /PendingStatusCount[\s\S]*COALESCE\((?:academic_records_consolidated\.)?is_excluded, 0\) = 0/,
  );
  assert.match(model, /WHERE ar\.id = \?[\s\S]*COALESCE\(ar\.is_excluded, 0\) = 0/);
});

test("Student Course counts only included enrollments", () => {
  const model = read("api/maintenance/studentsubject/studentsubject.model.js");
  assert.match(model, /records\.included_count AS total_count/);
});

test("Student Course aggregates the period before joining student details", () => {
  const model = read("api/maintenance/studentsubject/studentsubject.model.js");
  const migration = read("database/migrations/2026-08-12_student_course_period_index.sql");
  assert.match(model, /FROM \([\s\S]*WHERE school_year_id = \? AND semester_id = \?[\s\S]*GROUP BY student_id[\s\S]*\) AS records/);
  assert.match(model, /SUM\(is_excluded = 0\) AS included_count/);
  assert.match(migration, /idx_arc_period_student_excluded/);
});

test("Student Course detail loading has a student-first covering index", () => {
  const model = read("api/maintenance/studentsubject/studentsubject.model.js");
  const migration = read("database/migrations/2026-08-12_student_course_detail_index.sql");
  assert.match(
    model,
    /records\.student_id = \? AND records\.school_year_id = \?[\s\S]*records\.semester_id = \? AND records\.is_excluded = [01]/,
  );
  assert.match(migration, /idx_arc_student_period_excluded_course/);
  assert.match(
    migration,
    /student_id,\s*school_year_id,\s*semester_id,\s*is_excluded,\s*subject_id/,
  );
});

test("Student Course excluded table has complete aligned headers", () => {
  const script = read("client/maintenance/student_subject/script.js");
  ["Course code", "Course name", "Teacher", "Schedule", "Starts", "Ends", "Day", "Room", "Excluded", "Reason", "Actions"].forEach((title) => {
    assert.match(script, new RegExp(`title: ["']${title}["']`));
  });
  assert.doesNotMatch(script, /return `<td class="text-center fw-medium">/);
});

test("Student Course tables display teacher prefixes and suffixes", () => {
  const model = read("api/maintenance/studentsubject/studentsubject.model.js");
  const recordSelect = model.slice(model.indexOf("const recordSelect"), model.indexOf("const insertSql"));
  assert.match(recordSelect, /teachers\.prefix/);
  assert.match(recordSelect, /teachers\.givenname/);
  assert.match(recordSelect, /teachers\.surname/);
  assert.match(recordSelect, /teachers\.suffix/);
  assert.match(recordSelect, /AS teacher_name/);
});

test("Student Course excluded rows can be restored instead of edited", () => {
  const model = read("api/maintenance/studentsubject/studentsubject.model.js");
  const controller = read("api/maintenance/studentsubject/studentsubject.controller.js");
  const router = read("api/maintenance/studentsubject/studentsubject.router.js");
  const script = read("client/maintenance/student_subject/script.js");
  assert.match(router, /router\.put\("\/restore", restoreStudentSubject\)/);
  assert.match(controller, /restoreStudentSubject/);
  assert.match(model, /SET is_excluded = 0, reason = NULL/);
  assert.match(model, /WHERE id = \? AND is_excluded = 1/);
  assert.match(model, /Restored student course for \$\{record\.student_number\}/);
  assert.match(model, /Excluded student course for \$\{record\.student_number\}/);
  assert.match(model, /record\.subject_code/);
  assert.match(model, /record\.schedule_code/);
  assert.match(model, /record\.teacher_name/);
  assert.match(controller, /Restored student course for \$\{results\.record\.student_number\}/);
  assert.match(controller, /Excluded student course for \$\{results\.record\.student_number\}/);
  assert.match(script, /table-restore-button/);
  assert.match(script, />\s*Restore\s*<\/button>/);
  assert.match(script, /openRestoreModal/);
  assert.match(script, /confirmRestoreStudentSubject/);
  assert.doesNotMatch(script, /confirm\("Restore this course/);
  const page = read("client/maintenance/student_subject/index.html");
  assert.match(page, /id="restoreModal"/);
  assert.match(page, /Restore course\?/);
  assert.match(script, /Restoring student course/);
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

test("Google Workspace SSO verifies domain and links existing SATP users", () => {
  const controller = read("api/login/login.controller.js");
  const model = read("api/login/login.model.js");
  const router = read("api/login/login.router.js");
  const loginPage = read("client/login/index.html");
  const usersPage = read("client/user/user_management/index.html");
  const migration = read("database/migrations/2026-08-15_google_workspace_sso.sql");
  assert.match(controller, /verifyIdToken/);
  assert.match(controller, /identity\?\.email_verified/);
  assert.match(controller, /identity\.hd/);
  assert.match(controller, /GOOGLE_WORKSPACE_DOMAIN/);
  assert.match(model, /LOWER\(users\.google_email\) = LOWER\(\?\)/);
  assert.match(router, /router\.post\("\/google", googleLogin\)/);
  assert.match(loginPage, /accounts\.google\.com\/gsi\/client/);
  assert.match(loginPage, /Sign in using your institutional email\./);
  assert.match(usersPage, /name="google_email"/);
  assert.doesNotMatch(usersPage, /name="google_email"[^>]*required/);
  assert.match(usersPage, /School Google email <span class="optional-label">Optional<\/span>/);
  assert.match(migration, /UNIQUE INDEX uq_users_google_email/);
});

test("Administrator academic scope selects the default maintenance term", () => {
  const migration = read(
    "database/migrations/2026-08-17_admin_academic_scope.sql",
  );
  const semesterModel = read("api/maintenance/semester/semester.model.js");
  const semesterRouter = read("api/maintenance/semester/semester.router.js");
  const studentCourse = read("client/maintenance/student_subject/script.js");
  const scheduleAssignment = read(
    "client/maintenance/schedule_assignment/script.js",
  );
  const transactions = read("client/transaction/script.js");
  const adminPage = read("client/maintenance/admin/index.html");
  const userImport = read("client/user/user_management/script.js");
  const studentImportModel = read("api/maintenance/student/student.model.js");
  const schema = read("db.sql");

  assert.match(migration, /admin_academic_scope/);
  assert.match(migration, /ENUM\('COLLEGE', 'SHS', 'ALL'\)/);
  assert.match(semesterModel, /users\.admin_academic_scope = 'SHS'/);
  assert.match(semesterModel, /semesters\.is_current_shs = 1/);
  assert.match(semesterModel, /semesters\.is_current_college = 1/);
  assert.match(semesterRouter, /router\.get\("\/current\/admin"/);
  assert.match(studentCourse, /fetch\("\/api\/semester\/current\/admin"\)/);
  assert.match(scheduleAssignment, /fetch\("\/api\/semester\/current\/admin"\)/);
  assert.match(transactions, /fetch\("\/api\/semester\/current\/admin"\)/);
  assert.match(transactions, /loadSemester\.value = String\(currentSemester\.id\)/);
  assert.match(
    transactions,
    /loadSemester\.dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/,
  );
  assert.match(adminPage, /name="admin_academic_scope"/);
  assert.match(userImport, /\["COLLEGE", "SHS", "ALL"\]/);
  assert.match(userImport, /row\.admin_academic_scope \|\| "ALL"/);
  assert.match(userImport, /admin_academic_scope: student[\s\S]*?\? null/);
  assert.match(
    studentImportModel,
    /is_admin_rater, admin_academic_scope, is_active/,
  );
  assert.match(schema, /`admin_academic_scope` enum\('COLLEGE','SHS','ALL'\)/);
});

test("Transactions restrict visible data to the administrator academic scope", () => {
  const controller = read(
    "api/transaction/studentRatingStatus/srs.controller.js",
  );
  const model = read("api/transaction/studentRatingStatus/srs.model.js");

  assert.match(controller, /requesting_user_id: req\.user\.id/g);
  assert.ok(
    (model.match(/requesting_admin\.admin_academic_scope = 'SHS'/g) || [])
      .length >= 4,
  );
  assert.ok(
    (model.match(/requesting_admin\.admin_academic_scope = 'COLLEGE'/g) || [])
      .length >= 4,
  );
  assert.ok(
    (model.match(/COALESCE\(requesting_admin\.admin_academic_scope, 'ALL'\) = 'ALL'/g) || [])
      .length >= 4,
  );
});

test("Student Course restricts visible students to the administrator academic scope", () => {
  const controller = read(
    "api/maintenance/studentsubject/studentsubject.controller.js",
  );
  const model = read(
    "api/maintenance/studentsubject/studentsubject.model.js",
  );

  assert.ok((controller.match(/requesting_user_id: req\.user\.id/g) || []).length >= 5);
  assert.match(model, /scope_schools\.code/);
  assert.match(model, /THEN 'SHS' ELSE 'COLLEGE'/);
  assert.ok((model.match(/\$\{academicScopeFilter\}/g) || []).length >= 5);
  assert.match(model, /getIncludedSubjectsByStudentById: describeScopedRecord/);

  const studentController = read("api/maintenance/student/student.controller.js");
  const studentModel = read("api/maintenance/student/student.model.js");
  assert.match(studentController, /requesting_user_id: req\.user\.id/);
  assert.ok(
    (studentModel.match(/schools\.code/g) || [])
      .length >= 2,
  );
  assert.ok(
    (studentModel.match(/requesting_admin\.admin_academic_scope = CASE/g) || [])
      .length >= 2,
  );
});

test("Schedule Assignment restricts reads and actions to the administrator scope", () => {
  const controller = read(
    "api/maintenance/studentsubject/studentsubject.controller.js",
  );
  const model = read(
    "api/maintenance/studentsubject/studentsubject.model.js",
  );

  assert.match(
    controller,
    /getActiveScheduleAssignments\([\s\S]*requesting_user_id: req\.user\.id/,
  );
  assert.match(model, /COUNT\(DISTINCT arc\.student_id\) AS student_count/);
  assert.ok((model.match(/UPDATE \$\{TABLE\} AS arc/g) || []).length >= 3);
  assert.ok((model.match(/AND \$\{academicScopeFilter\}/g) || []).length >= 8);
});

test("User Management restricts permissions by account type", () => {
  const page = read("client/user/user_management/index.html");
  const script = read("client/user/user_management/script.js");

  assert.match(page, /id="addRole" required>[\s\S]*?<option value="" selected>Select type<\/option>/);
  assert.match(page, /id="permissionSelect"[\s\S]*?required disabled/);
  assert.match(script, /function configurePermissionSelect/);
  assert.match(script, /role === "student" \? isRater/);
  assert.match(script, /role === "admin" \? !isRater/);
  assert.match(script, /Student accounts must use the Rater permission/);
  assert.match(script, /Admin accounts cannot use the Rater permission/);
});

test("Admin Maintenance provides a reviewed XLSX import workflow", () => {
  const page = read("client/maintenance/admin/index.html");
  const script = read("client/maintenance/admin/script.js");
  const model = read("api/maintenance/admin/admin.model.js");

  [
    "importFileModal",
    "importPreviewModal",
    "spinnerStatusModal",
    "createdPreview",
    "updatedPreview",
    "unchangedPreview",
    "errorPreview",
    "runAdminImportButton",
  ].forEach((id) => assert.match(page, new RegExp(`id="${id}"`)));
  assert.match(page, /xlsx\.full\.min\.js/);
  assert.match(script, /function classifyAdminImport/);
  assert.match(script, /admin_academic_scope/);
  assert.match(script, /type === "created" \? item\.password : ""/);
  assert.match(script, /Permission is inactive, Rater, or not found/);
  assert.match(model, /user_info\.gender/);
});

test("Equivalent maintenance import pages use the same review and progress workflow", () => {
  const pages = [
    "college",
    "course",
    "departments",
    "items",
    "room",
    "student",
    "subject",
    "teacher",
  ];
  pages.forEach((page) => {
    const html = read(`client/maintenance/${page}/index.html`);
    [
      "importFileModal",
      "importPreviewModal",
      "spinnerStatusModal",
      "runImportButton",
      "createdPreview",
      "updatedPreview",
      "errorPreview",
      "toast-container",
    ].forEach((id) =>
      assert.match(
        html,
        new RegExp(`id=["']${id}["']`),
        `${page} is missing ${id}`,
      ),
    );
    assert.match(html, /Validation complete/i, `${page} needs the standard validation result heading`);
    assert.match(html, /Import in progress/i, `${page} needs the standard import progress heading`);
  });
});

test("Standard maintenance tables hide inactive records by default", () => {
  const pages = [
    "admin",
    "category",
    "college",
    "course",
    "departments",
    "items",
    "room",
    "school_year",
    "semester",
    "student",
    "subject",
    "teacher",
  ];
  pages.forEach((page) => {
    const html = read(`client/maintenance/${page}/index.html`);
    assert.match(
      html,
      /<script\s+src=["']\.\.\/active-filter\.js["']\s*>\s*<\/script>/,
      `${page} must provide the shared Show inactive toggle`,
    );
  });
});

test("Authenticated non-Grad School pages share the same shell services", () => {
  const authenticatedPages = walk(path.join(root, "client")).filter((file) => {
    if (!file.endsWith(".html") || file.toLowerCase().includes("gradschool"))
      return false;
    const html = fs.readFileSync(file, "utf8");
    return (
      html.includes("/auth-session.js") &&
      /class=["'][^"']*site-header/.test(html)
    );
  });
  authenticatedPages.forEach((file) => {
    const html = fs.readFileSync(file, "utf8");
    const relative = path.relative(root, file);
    assert.match(html, /id=["']sidebar-container["']/, `${relative} needs the shared sidebar host`);
    assert.match(html, /<script\s+src=["']\/shared-ui\.js["']\s*>\s*<\/script>/, `${relative} needs shared UI behavior`);
  });
});

test("Non-Grad School confirmations use the shared SATP modal", () => {
  const scripts = walk(path.join(root, "client")).filter(
    (file) =>
      file.endsWith(".js") &&
      !file.toLowerCase().includes("gradschool") &&
      !file.includes(`${path.sep}vendor${path.sep}`),
  );
  scripts.forEach((file) => {
    const script = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      script,
      /(?:window\.)?confirm\s*\(/,
      `${path.relative(root, file)} still uses a browser confirmation`,
    );
  });
  const shared = read("client/shared-ui.js");
  assert.match(shared, /window\.satpConfirm\s*=/);
  assert.match(shared, /role", "dialog"/);
  assert.match(shared, /aria-modal/);
  assert.match(shared, /event\.key === "Escape"/);
});

test("Student Maintenance treats school Google email as optional", () => {
  const page = read("client/maintenance/student/index.html");
  const script = read("client/maintenance/student/script.js");
  const model = read("api/maintenance/student/student.model.js");

  assert.match(page, /name="google_email"/);
  assert.doesNotMatch(page, /name="google_email"[^>]*required/);
  assert.match(page, /google_email is optional/);
  assert.match(script, /google_email: item\.google_email/);
  assert.match(script, /raw\.google_email \|\| raw\.email/);
  assert.match(model, /String\(data\.google_email \|\| ""\)\.trim\(\) \|\| null/);
});

test("User Management import treats school Google email as optional", () => {
  const page = read("client/user/user_management/index.html");
  const script = read("client/user/user_management/script.js");

  assert.match(page, /google_email is optional/);
  assert.match(script, /google_email: "juan\.delacruz@ndmu\.edu\.ph"/);
  assert.match(script, /row\.google_email \|\| row\.email/);
  assert.doesNotMatch(
    script,
    /const required =[\s\S]{0,300}["']google_email["']/,
  );
});

test("Regular account imports preserve existing passwords", () => {
  const users = read("client/user/user_management/script.js");
  const students = read("client/maintenance/student/script.js");

  assert.match(users, /Password or institutional email is required for a new user/);
  assert.match(users, /password: existing \? "" : row\.password/);
  assert.match(users, /existing \? "\/api\/user\/update" : "\/api\/user\/add"/);
  assert.match(
    students,
    /Password or institutional email is required when creating a new student/,
  );
  assert.doesNotMatch(
    students,
    /requestJson\("\/api\/student\/update\/password"/,
  );
});

test("Rater accounts cannot see or open the self-service password page", () => {
  const sidebar = read("client/sidebar.html");
  const passwordPage = read("client/update/password/script.js");
  const auth = read("auth/auth_validation.js");
  const loginRouter = read("api/login/login.router.js");
  const server = read("index.js");

  assert.match(
    sidebar,
    /<!-- permission:non-rater:start -->[\s\S]*id="update-password-action"/,
  );
  assert.match(
    passwordPage,
    /permissionName: localStorage\.getItem\("permission_name"\)/,
  );
  assert.match(passwordPage, /toLowerCase\(\) === "rater"/);
  assert.match(auth, /function requireNonRater\(req, res, next\)/);
  assert.match(auth, /permission_name[\s\S]*?toLowerCase\(\) !== "rater"/);
  assert.match(
    loginRouter,
    /"\/update\/password",\s*checkToken,\s*requireNonRater,\s*updatePassword/,
  );
  assert.match(
    server,
    /app\.use\("\/update\/password", checkToken, \(req, res, next\) =>/,
  );
  assert.match(server, /return res\.redirect\(302, "\/404\.html"\)/);
  assert.match(passwordPage, /location\.replace\("\/404\.html"\)/);
  assert.ok(
    server.indexOf(
      'app.use("/update/password", checkToken, (req, res, next) =>',
    ) <
      server.indexOf("app.use(express.static(clientPath))"),
  );
});

test("Sidebar HTML omits modules the authenticated account cannot access", () => {
  const sidebar = read("client/sidebar.html");
  const session = read("client/auth-session.js");
  const server = read("index.js");

  for (const access of [
    "transaction_access",
    "reports_access",
    "maintenance_access",
    "users_access",
  ]) {
    assert.match(sidebar, new RegExp(`<!-- access:${access}:start -->`));
    assert.match(server, new RegExp(`\\["access:${access}", "${access}"\\]`));
  }

  assert.match(server, /app\.get\("\/sidebar\.html", checkToken/);
  assert.match(server, /function removeSidebarBlock\(html, marker\)/);
  assert.match(server, /\.set\("Cache-Control", "no-store"\)/);
  assert.match(session, /if \(!permitted\) item\.remove\(\)/);
  assert.ok(
    server.indexOf('app.get("/sidebar.html", checkToken') <
      server.indexOf("app.use(express.static(clientPath))"),
  );
});

test("Google-only accounts may omit a local password", () => {
  const login = read("api/login/login.controller.js");
  const users = read("api/user/user_management/user_management.controller.js");
  const students = read("api/maintenance/student/student.model.js");
  const migration = read(
    "database/migrations/2026-08-15_users_optional_password.sql",
  );

  assert.match(users, /!plainPassword && !body\.google_email/);
  assert.match(students, /!plainTextPassword && !String\(data\.google_email/);
  assert.match(login, /Boolean\(results\.password\)/);
  assert.match(migration, /password VARCHAR\(255\) NULL/);
});

test("Admin Maintenance supports optional institutional emails", () => {
  const page = read("client/maintenance/admin/index.html");
  const script = read("client/maintenance/admin/script.js");
  const model = read("api/maintenance/admin/admin.model.js");

  assert.match(page, /name="google_email"/);
  assert.doesNotMatch(page, /name="google_email"[^>]*required/);
  assert.match(script, /data:\s*"google_email"/);
  assert.match(model, /users\.google_email/);
  assert.match(model, /!plainTextPassword && !String\(data\.google_email/);
  assert.match(model, /UPDATE users SET google_email=\?, permission_id=\?/);
});

test("Google login keeps the MIS support message inside the fixed login card", () => {
  const page = read("client/login/index.html");
  const style = read("client/login/style.css");
  assert.match(page, /class="support"/);
  assert.match(page, /MIS Department/);
  assert.match(style, /\.sign-in\s*\{[\s\S]*padding: 26px clamp\(38px, 6vw, 72px\)/);
  assert.match(style, /\.message\s*\{[\s\S]*height: 54px/);
  assert.match(style, /\.support\s*\{[\s\S]*margin: 10px 0 0;[\s\S]*padding-top: 10px;/);
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

test("Transaction table and dashboard totals render in one loading cycle", () => {
  const transactions = read("client/transaction/script.js");

  assert.match(
    transactions,
    /const \[res, stats\] = await Promise\.all\(\[[\s\S]*?API\.loadDashboardStats\(\{ render: false \}\)/,
  );
  assert.match(
    transactions,
    /mainTable[\s\S]*?\.draw\(\);[\s\S]*?API\.renderDashboardStats\(stats\);/,
  );
  assert.match(transactions, /async loadDashboardStats\(\{ render = true \} = \{\}\)/);
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
    /disableSelectPlaceholders\(node\)/,
  );
  assert.doesNotMatch(sharedUi, /disableSelectPlaceholders\(node\.parentElement/);
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
      /<script\s+src="\/shared-ui\.js"\s*>\s*<\/script>/,
      path.relative(root, file),
    );
  });
});

test("Schedule Assignment loads the current period initially and reloads on demand", () => {
  const page = read("client/maintenance/schedule_assignment/index.html");
  const script = read("client/maintenance/schedule_assignment/script.js");
  assert.match(page, /id="loadRecordsButton"[^>]*>Load records<\/button>/);
  assert.match(script, /ajax:\s*\{\s*url: selectedPeriodUrl\(\)/);
  assert.match(script, /function loadSelectedPeriod\(\)/);
  assert.match(script, /getElementById\("loadRecordsButton"\)[\s\S]*addEventListener\("click", loadSelectedPeriod\)/);
  assert.doesNotMatch(script, /getElementById\(id\)\.addEventListener\("change"/);
  assert.match(script, /enhanceSearchableSelect\(document\.getElementById\("schoolYearSelect"\)\)/);
  assert.match(script, /enhanceSearchableSelect\(document\.getElementById\("semesterSelect"\)\)/);
  assert.match(script, /select\.dataset\.searchable = "true"/);
});

test("Semester dropdowns list active terms instead of legacy in-use terms", () => {
  const dropdownScripts = [
    "client/report/ranking/script.js",
    "client/report/rating/script.js",
    "client/maintenance/student_subject/script.js",
  ];

  dropdownScripts.forEach((file) => {
    const source = read(file);
    assert.match(source, /\/api\/semester\/all\/active/);
    assert.doesNotMatch(source, /\/api\/semester\/inuse\/active/);
  });
});

test("School-year dropdowns list active years and select the current year where required", () => {
  const reportScripts = [
    "client/report/ranking/script.js",
    "client/report/rating/script.js",
  ];
  reportScripts.forEach((file) => {
    const source = read(file);
    assert.match(source, /\/api\/schoolyear\/all\/active/);
    assert.doesNotMatch(source, /\/api\/schoolyear\/current/);
    assert.doesNotMatch(source, /\/api\/schoolyear\/inuse\/active/);
    assert.doesNotMatch(
      source,
      /if \(rows\.length === 1\) select\.value = rows\[0\]\.id/,
    );
  });

  const studentCourse = read("client/maintenance/student_subject/script.js");
  assert.match(studentCourse, /\/api\/schoolyear\/all\/active/);
  assert.match(studentCourse, /\/api\/schoolyear\/current/);
  assert.doesNotMatch(studentCourse, /\/api\/schoolyear\/inuse\/active/);
  assert.match(read("client/rating/script.js"), /\/api\/schoolyear\/current/);
  const transactions = read("client/transaction/script.js");
  assert.match(transactions, /fetch\(`\/api\/\$\{endpoint\}\/all\/active`\)/);
  assert.match(transactions, /fetch\("\/api\/schoolyear\/current"\)/);
  assert.doesNotMatch(transactions, /\/api\/\$\{endpoint\}\/inuse\/active/);
  const scheduleAssignment = read("client/maintenance/schedule_assignment/script.js");
  assert.match(scheduleAssignment, /fetch\("\/api\/schoolyear\/all\/active"\)/);
  assert.match(scheduleAssignment, /fetch\("\/api\/schoolyear\/current"\)/);
  assert.doesNotMatch(scheduleAssignment, /fetch\("\/api\/schoolyear"\)(?!\/)/);
  assert.match(read("api/maintenance/schoolyear/schoolyear.router.js"), /router\.get\("\/current", getCurrentSchoolYear\)/);
});

test("Report dropdown panels are not clipped by the report card", () => {
  const rankingStyle = read("client/report/ranking/style.css");
  const ratingStyle = read("client/report/rating/style.css");

  assert.match(rankingStyle, /\.report-card\s*\{[\s\S]*?overflow:\s*visible/);
  assert.match(
    rankingStyle,
    /\.report-form \.search-select\.open,[\s\S]*?z-index:\s*400/,
  );
  assert.match(ratingStyle, /@import url\("\.\.\/ranking\/style\.css"\)/);
});

test("Rating report dropdowns remain open for clicks inside the control", () => {
  const ratingScript = read("client/report/rating/script.js");

  assert.match(
    ratingScript,
    /document\.addEventListener\("click", \(event\) => \{\s*if \(event\.target\.closest\("\.search-select"\)\) return;/,
  );
  assert.doesNotMatch(
    ratingScript,
    /document\.addEventListener\("click", \(\) => \{\s*document\s*\.querySelectorAll\("\.search-select\.open"\)/,
  );
});

test("Program dropdowns provide search inside the option panel", () => {
  const shared = read("client/shared-ui.js");
  const student = read("client/maintenance/student/index.html");
  const users = read("client/user/user_management/index.html");
  const registration = read("client/register/index.html");
  ["courseSelect", "editCourseSelect"].forEach((id) => {
    assert.match(student, new RegExp(`id=["']${id}["'][^>]*data-searchable-select=["']program["']`));
  });
  ["addCourse", "editCourse"].forEach((id) => {
    assert.match(users, new RegExp(`id=["']${id}["'][^>]*data-searchable-select=["']program["']`));
  });
  assert.match(registration, /id="course"[^>]*data-live-search="true"/);
  assert.match(shared, /satp-search-select-search/);
  assert.match(student, /data-search-placeholder="Search programs\.\.\."/);
  assert.match(users, /data-search-placeholder="Search programs\.\.\."/);
});

test("All non-Grad School form dropdowns receive the shared searchable control", () => {
  const shared = read("client/shared-ui.js");
  assert.match(shared, /root\.querySelectorAll\?\.\("select"\)/);
  assert.match(shared, /select\.closest\("\.dataTables_length, \.search-select, \.satp-search-select"\)/);
  assert.match(shared, /select\.dataset\.searchable = "true"/);
  assert.match(shared, /location\.pathname\.toLowerCase\(\)\.includes\("gradschool"\)/);
  assert.match(shared, /search-select-search satp-search-select-search/);
});

test("Teacher Maintenance safely merges duplicate teachers and their schedules", () => {
  const model = read("api/maintenance/teacher/teacher.model.js");
  const router = read("api/maintenance/teacher/teacher.router.js");
  const page = read("client/maintenance/teacher/index.html");
  const script = read("client/maintenance/teacher/script.js");

  assert.match(router, /router\.put\("\/merge", mergeTeacher\)/);
  assert.match(model, /beginTransaction\(\)/);
  assert.match(model, /UPDATE academic_records_consolidated[\s\S]*SET teacher_id = \?/);
  assert.match(model, /UPDATE trans_item SET transaction_id = \?/);
  assert.match(model, /UPDATE student_subject SET teacher_id = \?/);
  assert.match(model, /UPDATE transactions SET teacher_id = \?/);
  assert.match(model, /INSERT IGNORE INTO academic_record_departments/);
  assert.match(
    model,
    /retained_department\.department_id = duplicate_department\.department_id/,
  );
  assert.match(model, /DELETE FROM teachers WHERE id = \?/);
  assert.match(model, /commit\(\)/);
  assert.match(model, /rollback\(\)/);
  assert.match(page, /id="mergeTeacherForm"/);
  assert.match(page, /onclick="openMergeFromEdit\(\)"/);
  assert.match(page, /id="mergeDuplicateTeacher"/);
  assert.match(page, /Teacher record to keep/);
  assert.match(page, /id="mergeLoadingModal"/);
  assert.match(script, /const retainedTeacherId = Number\(rowIdToUpdate\)/);
  assert.match(script, /This action is irreversible and cannot be undone/);
  assert.match(script, /confirmText: "Merge permanently"/);
  assert.match(script, /satpConfirm\([\s\S]*Permanently merge teachers/);
  assert.match(script, /fetch|requestJson\("\/api\/teacher\/merge"/);
});

test("Teacher edit waits for departments and synchronizes searchable dropdowns", () => {
  const teacher = read("client/maintenance/teacher/script.js");

  assert.match(teacher, /let departmentsLoadPromise;/);
  assert.match(
    teacher,
    /const \[, response\] = await Promise\.all\(\[\s*loadDepartments\(\),\s*requestJson\(`\/api\/teacher\/\$\{id\}`\)/,
  );
  assert.match(
    teacher,
    /departmentSelect\.dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/,
  );
});

test("Student Course marks its clean sidebar path and parent module active", () => {
  const script = read("client/maintenance/student_subject/script.js");
  assert.match(script, /replace\(\/\\\/index\\\.html\$\/i, ""\)/);
  assert.match(script, /link\.classList\.add\(submenu \? "sub-active" : "nav-active"\)/);
  assert.match(script, /toggle\?\.classList\.add\("nav-active"\)/);
});

test("School Maintenance owns colleges and cascades the full hierarchy", () => {
  const migration = read("database/migrations/2026-08-22_school_hierarchy.sql");
  const model = read("api/maintenance/school/school.model.js");
  const collegeModel = read("api/maintenance/college/college.model.js");
  const collegePage = read("client/maintenance/college/index.html");
  const collegeScript = read("client/maintenance/college/script.js");
  const schoolPage = read("client/maintenance/school/index.html");
  const schoolScript = read("client/maintenance/school/script.js");
  const sidebar = read("client/sidebar.html");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS schools/);
  assert.match(migration, /ADD COLUMN school_id/);
  assert.match(migration, /FOREIGN KEY \(school_id\) REFERENCES schools/);
  assert.doesNotMatch(migration, /academic_scope ENUM/);
  assert.match(model, /UPDATE colleges SET is_active/);
  assert.match(model, /UPDATE departments/);
  assert.match(model, /UPDATE courses/);
  assert.match(collegeModel, /school_id/);
  assert.match(collegePage, /name="school_id"/);
  assert.match(collegePage, /school_code/);
  assert.match(collegeScript, /loadSchools/);
  assert.match(schoolPage, /id="newSchoolForm"/);
  assert.doesNotMatch(schoolPage, /name="academic_scope"/);
  assert.ok(
    (schoolScript.match(/const form = event\.currentTarget;/g) || []).length >= 2,
    "School create and edit must retain their forms before awaiting confirmation",
  );
  assert.doesNotMatch(
    schoolScript,
    /formPayload\(event\.currentTarget/,
  );
  assert.match(sidebar, /maintenance\/school\/index\.html/);
  assert.ok(
    sidebar.indexOf("/maintenance/departments/index.html") <
      sidebar.indexOf("/maintenance/course/index.html"),
  );
});

test("Schedule reassignment accepts teachers assigned within the same school", () => {
  const page = read("client/maintenance/schedule_assignment/index.html");
  const script = read("client/maintenance/schedule_assignment/script.js");
  const model = read(
    "api/maintenance/studentsubject/studentsubject.model.js",
  );
  assert.match(script, /option\.dataset\.schoolIds/);
  assert.match(script, /selectedAssignment\.teaching_school_id/);
  assert.match(page, /class="assignment-department"/);
  assert.match(page, /id="assignmentAcademicScope"/);
  assert.match(page, /id="teacherSchoolLabel"/);
  assert.match(script, /function getAssignmentAcademicScope/);
  assert.match(script, /=== "SHS"[\s\S]*\? "SHS"[\s\S]*: "College"/);
  assert.match(script, /under \$\{selectedAssignment\.teaching_school_code\}/);
  assert.match(model, /FROM teacher_departments/);
  assert.match(model, /eligible_colleges\.school_id = \?/);
  assert.match(
    model,
    /SET arc\.teacher_id = \?/,
  );
  assert.doesNotMatch(model, /SET arc\.teacher_id = \?, arc\.teaching_department_id/);
  assert.doesNotMatch(model, /arc\.teaching_status = \?/);
});

test("Teacher teaching status is stored per department and drives rankings", () => {
  const teacherPage = read("client/maintenance/teacher/index.html");
  const teacherScript = read("client/maintenance/teacher/script.js");
  const teacherModel = read("api/maintenance/teacher/teacher.model.js");
  const rankingModel = read("api/reports/ranking/ranking.model.js");
  const statusMigration = read(
    "database/migrations/2026-08-22_teacher_department_teaching_status.sql",
  );
  const studentCoursePage = read(
    "client/maintenance/student_subject/index.html",
  );
  assert.match(teacherPage, /Primary teaching status/);
  assert.match(teacherScript, /department_assignments/);
  assert.match(teacherModel, /teacher_departments\.teaching_status/);
  assert.match(
    rankingModel,
    /COALESCE\(exact_assignment\.teaching_status, teaching_assignment\.teaching_status\) = \?/,
  );
  assert.match(rankingModel, /academic_record_departments AS record_department/);
  assert.match(statusMigration, /ADD COLUMN teaching_status/);
  assert.match(statusMigration, /ALTER TABLE teachers[\s\S]*DROP COLUMN is_part_time/);
  assert.doesNotMatch(
    statusMigration,
    /ALTER TABLE academic_records_consolidated[\s\S]*teaching_status/,
  );
  assert.doesNotMatch(studentCoursePage, /department_teaching_statuses/);
});

test("Teacher department assignments use a compact picker with per-department status", () => {
  const page = read("client/maintenance/teacher/index.html");
  const script = read("client/maintenance/teacher/script.js");
  const style = read("client/maintenance/teacher/style.css");

  assert.match(page, /id="additionalDepartmentPicker"/);
  assert.match(page, /id="editAdditionalDepartmentPicker"/);
  assert.match(page, /class="field primary-status-field"/);
  assert.match(script, /const departmentAssignmentState =/);
  assert.match(script, /function addDepartmentAssignment/);
  assert.match(script, /status\.dataset\.noSearch = "true"/);
  assert.match(style, /\.department-assignment-row/);
  assert.match(style, /max-height: 132px/);
});

test("Student Course import validates departments without storing them on ARC", () => {
  const page = read("client/maintenance/student_subject/index.html");
  const script = read("client/maintenance/student_subject/script.js");
  const controller = read(
    "api/maintenance/studentsubject/studentsubject.controller.js",
  );
  const model = read(
    "api/maintenance/studentsubject/studentsubject.model.js",
  );
  const migration = read(
    "database/migrations/2026-08-22_teacher_departments_and_assignment_scope.sql",
  );
  const cleanupMigration = read(
    "database/migrations/2026-08-22_remove_arc_teaching_department.sql",
  );
  const recordDepartmentMigration = read(
    "database/migrations/2026-08-22_academic_record_departments.sql",
  );
  const schema = read("db.sql");
  const ranking = read("api/reports/ranking/ranking.model.js");
  const rating = read("api/reports/rating/rating.model.js");
  assert.match(page, /id="importSchoolSelect" name="import_school_id"/);
  assert.doesNotMatch(page, /name="import_academic_scope"/);
  assert.match(script, /resolveTeachingDepartment/);
  assert.match(script, /school_id: pendingSubjectImport\.schoolId/);
  assert.match(script, /fetch\("\/api\/school\/all\/active"\)/);
  assert.doesNotMatch(script, /configureImportScopeOptions/);
  assert.match(controller, /teaching_department_id/);
  assert.match(controller, /"school_id"/);
  assert.match(model, /FROM teacher_departments/);
  assert.match(model, /schools\.id AS school_id/);
  assert.match(model, /teaching_department_id/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS teacher_departments/);
  assert.doesNotMatch(migration, /ADD COLUMN teaching_department_id/);
  assert.match(cleanupMigration, /DROP COLUMN teaching_department_id/);
  assert.match(recordDepartmentMigration, /CREATE TABLE IF NOT EXISTS academic_record_departments/);
  assert.match(model, /INSERT INTO academic_record_departments/);
  assert.doesNotMatch(schema, /`teaching_department_id`/);
  assert.doesNotMatch(model, /arc\.teaching_department_id|records\.teaching_department_id/);
  assert.doesNotMatch(ranking, /arc\.teaching_department_id/);
  assert.doesNotMatch(rating, /arc\.teaching_department_id/);
});

test("Manual Add student course derives school and department from the student", () => {
  const page = read("client/maintenance/student_subject/index.html");
  const script = read("client/maintenance/student_subject/script.js");
  const studentModel = read("api/maintenance/student/student.model.js");
  const enrollmentModel = read(
    "api/maintenance/studentsubject/studentsubject.model.js",
  );

  assert.match(page, /id="addStudentSchool"/);
  assert.match(page, /type="hidden" name="teaching_department_id"/);
  assert.match(script, /use_student_department: true/);
  assert.match(script, /event\.target\.closest\?\.\("\.search-select"\)/);
  assert.match(script, /Number\(assignment\.id\) === Number\(student\.department_id\)/);
  assert.match(studentModel, /departments\.id AS department_id/);
  assert.match(enrollmentModel, /data\.use_student_department === true/);
  assert.match(
    enrollmentModel,
    /teaching_department_id: students\[0\]\.student_department_id/,
  );
});

test("Shared pages and report exports include Safari compatibility safeguards", () => {
  const sharedUi = read("client/shared-ui.js");
  const sidebar = read("client/sidebar.html");
  const rating = read("client/rate/script.js");
  const pdfExport = read("client/report/html2pdf-export.js");
  const bulkExport = read("client/report/rating/bulk-export.js");

  assert.match(sharedUi, /visualViewport/);
  assert.match(sharedUi, /--satp-viewport-height/);
  assert.match(sharedUi, /-webkit-overflow-scrolling: touch/);
  assert.match(sidebar, /height: 100vh;[\s\S]*height: 100dvh;/);
  assert.match(sidebar, /body\.satp-sidebar-present #main/);
  assert.doesNotMatch(sidebar, /body:has\(/);
  assert.doesNotMatch(rating, /querySelector\([^\n]*:has\(/);
  assert.match(pdfExport, /16000000/);
  assert.match(pdfExport, /safariAreaLimitedScale/);
  assert.match(bulkExport, /document\.body\.appendChild\(link\)/);
});

test("Report generation writes one transparent activity-log entry", () => {
  const server = read("index.js");
  const model = read("api/reports/report_log.model.js");
  const controller = read("api/reports/report_log.controller.js");
  const sharedUi = read("client/shared-ui.js");
  const rating = read("client/report/rating/script.js");
  const ranking = read("client/report/ranking/script.js");
  const bulk = read("client/report/rating/bulk-export.js");

  assert.match(server, /"\/api\/report\/log"[\s\S]*requirePermission\("reports_access"\)/);
  assert.match(model, /INSERT INTO activity_log/);
  assert.match(model, /FROM school_years/);
  assert.match(model, /FROM semesters/);
  assert.match(model, /FROM teachers/);
  assert.match(controller, /Generated a bulk report export/);
  assert.match(controller, /School year:/);
  assert.match(controller, /Semester:/);
  assert.match(controller, /Teaching status:/);
  assert.match(controller, /Teacher: All teachers/);
  assert.match(sharedUi, /fetch\("\/api\/report\/log"/);
  assert.match(rating, /reportType: data\.ratingReport/);
  assert.match(rating, /teacherId: data\.teacher \|\| null/);
  assert.match(ranking, /teachingStatus: data\.teaching_status/);
  assert.equal((bulk.match(/satpLogReportGeneration/g) || []).length, 1);
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
