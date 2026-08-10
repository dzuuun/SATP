"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDir = path.resolve(__dirname, "..", "docs", "screenshots");
const password = process.env.SATP_DOC_PASSWORD;
const username = process.env.SATP_DOC_USERNAME || "superadmin";
if (!password) throw new Error("SATP_DOC_PASSWORD is required.");

const pages = [
  ["03-transactions.png", "/transaction/"],
  ["04-rating-reports.png", "/report/rating/"],
  ["05-ranking-reports.png", "/report/ranking/"],
  ["06-student-maintenance.png", "/maintenance/student/", 5000],
  ["07-student-course.png", "/maintenance/student_subject/", 10000],
  ["08-schedule-assignment.png", "/maintenance/schedule_assignment/", 5000],
  ["09-permissions.png", "/user/permission/"],
  ["10-activity-log.png", "/user/activity_log/"],
  ["11-college-maintenance.png", "/maintenance/college/", 5000],
  ["12-department-maintenance.png", "/maintenance/departments/", 5000],
  ["13-program-maintenance.png", "/maintenance/course/", 5000],
  ["14-course-maintenance.png", "/maintenance/subject/", 5000],
  ["15-teacher-maintenance.png", "/maintenance/teacher/", 5000],
  ["16-admin-maintenance.png", "/maintenance/admin/", 5000],
  ["17-school-year-maintenance.png", "/maintenance/school_year/", 5000],
  ["18-semester-maintenance.png", "/maintenance/semester/", 5000],
  ["19-room-maintenance.png", "/maintenance/room/", 5000],
  ["20-category-maintenance.png", "/maintenance/category/", 5000],
  ["21-item-maintenance.png", "/maintenance/items/", 5000],
];
const selectedPages = process.env.SATP_STUDENT_CAPTURE === "1"
  ? [["22-student-courses-to-rate.png", "/rating/", 6000]]
  : process.env.SATP_CAPTURE_ONLY
  ? pages.filter(([file]) => file === process.env.SATP_CAPTURE_ONLY)
  : pages;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDebugger(port) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) return response.json();
    } catch {}
    await delay(250);
  }
  throw new Error("Chrome debugging endpoint did not start.");
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const port = 9333;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "satp-manual-"));
  const browser = spawn(chrome, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${process.env.SATP_CAPTURE_WINDOW || "1440,1000"}`,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "http://localhost:3000/login/",
  ], { stdio: "ignore" });

  try {
    const targets = await waitForDebugger(port);
    const target = targets.find((item) => item.type === "page");
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    let id = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const commandId = ++id;
      pending.set(commandId, { resolve, reject });
      socket.send(JSON.stringify({ id: commandId, method, params }));
    });
    await command("Page.enable");
    await command("Runtime.enable");
    await delay(1000);
    const credentials = JSON.stringify({ username, password });
    const login = await command("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const response = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(${credentials})});
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        const data = result.data;
        localStorage.clear();
        Object.entries({user_id:result.user_id,username:data.username,permission_id:data.permission_id,permission_name:data.permission_name,is_student_rater:data.is_student_rater,transactionAccess:data.transaction_access,maintenanceAccess:data.maintenance_access,reportsAccess:data.reports_access,usersAccess:data.users_access,fullname:data.full_name}).forEach(([key,value]) => localStorage.setItem(key,value));
        return result.message;
      })()`,
    });
    if (login.exceptionDetails) throw new Error("Login failed in browser session.");

    for (const [file, route, wait = 2500] of selectedPages) {
      await command("Page.navigate", { url: `http://localhost:3000${route}` });
      await delay(wait);
      if (route === "/maintenance/student_subject/") {
        await command("Runtime.evaluate", {
          expression: `(() => {
            const overlay = document.getElementById('tableLoadingOverlay');
            if (overlay) overlay.classList.add('invisible');
            document.body.classList.remove('overflow-hidden');
          })()`,
        });
        await delay(300);
      }
      if (route === "/maintenance/schedule_assignment/") {
        await command("Runtime.evaluate", {
          expression: `(() => {
            const modal = document.getElementById('loadingModal');
            if (modal) modal.classList.add('invisible');
            document.body.style.overflow = '';
          })()`,
        });
        await delay(300);
      }
      if (process.env.SATP_CAPTURE_OPEN_SIDEBAR === "1") {
        await command("Runtime.evaluate", {
          expression: "typeof toggleNav === 'function' && toggleNav()",
        });
        await delay(400);
      }
      const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      fs.writeFileSync(path.join(outputDir, file), Buffer.from(screenshot.data, "base64"));
      console.log(file);
    }
    if (process.env.SATP_STUDENT_CAPTURE === "1") {
      const opened = await command("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const button = document.querySelector('.rate-button');
          if (!button) return false;
          button.click();
          return true;
        })()`,
      });
      if (opened.result?.value) {
        await delay(6000);
        const assessment = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        fs.writeFileSync(path.join(outputDir, "23-student-assessment.png"), Buffer.from(assessment.data, "base64"));
        console.log("23-student-assessment.png");
      } else {
        console.warn("No pending course was available for the assessment-form screenshot.");
      }
    }
    socket.close();
  } finally {
    browser.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
