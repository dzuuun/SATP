require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const {
  checkToken,
  requirePermission,
  protectMaintenanceChanges,
} = require("./auth/auth_validation");
const {
  apiRequestContext,
  maintenanceApiStandards,
  apiNotFound,
  apiErrorHandler,
} = require("./api/middleware/api_standards");

if (!process.env.SECRET_KEY) {
  throw new Error("SECRET_KEY must be configured before starting SATP.");
}

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const trustProxy = process.env.TRUST_PROXY === "true";
const enforceHttps = process.env.HTTPS_ONLY === "true";
const allowDirectHttp = process.env.ALLOW_DIRECT_HTTP === "true";

if (trustProxy) app.set("trust proxy", 1);
if (enforceHttps && !trustProxy) {
  throw new Error(
    "HTTPS_ONLY=true requires TRUST_PROXY=true when TLS is terminated by a reverse proxy.",
  );
}

app.use((req, res, next) => {
  const cameThroughProxy = Boolean(req.get("x-forwarded-proto"));
  const permittedDirectHttp = allowDirectHttp && !cameThroughProxy;
  if (enforceHttps && !req.secure && !permittedDirectHttp) {
    return res.redirect(308, `https://${req.get("host")}${req.originalUrl}`);
  }
  if (req.secure && isProduction) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return next();
});

// --- Middleware ---
app.use(apiRequestContext);
app.use(express.json({ limit: process.env.API_JSON_LIMIT || "10mb", strict: true }));
app.use(morgan("combined"));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// --- API Routes ---
const loginRouter = require("./api/login/login.router");

// Maintenance
const schoolYearRouter = require("./api/maintenance/schoolyear/schoolyear.router");
const subjectRouter = require("./api/maintenance/subjects/subjects.router");
const roomRouter = require("./api/maintenance/rooms/rooms.router");
const departmentRouter = require("./api/maintenance/department/department.router");
const collegeRouter = require("./api/maintenance/college/college.router");
const schoolRouter = require("./api/maintenance/school/school.router");
const courseRouter = require("./api/maintenance/course/course.router");
const semesterRouter = require("./api/maintenance/semester/semester.router");
const teacherRouter = require("./api/maintenance/teacher/teacher.router");
const categoryRouter = require("./api/maintenance/category/category.router");
const itemRouter = require("./api/maintenance/item/item.router");
const studentSubjectRouter = require("./api/maintenance/studentsubject/studentsubject.router");
const studentRouter = require("./api/maintenance/student/student.router");
const adminRouter = require("./api/maintenance/admin/admin.router");
const gradSchoolItemRouter = require("./api/maintenance/gradschool_items/gsitem.router");

// User
const logRouter = require("./api/user/activity_log/log.router");
const permissionRouter = require("./api/user/permission/permission.router");
const userRouter = require("./api/user/user_management/user_management.router");

// Transaction
const transactionRouter = require("./api/transaction/studentRatingStatus/srs.router");

// Reports
const rankingRouter = require("./api/reports/ranking/ranking.router");
const ratingRouter = require("./api/reports/rating/rating.router");
const reportLogRouter = require("./api/reports/report_log.router");

// --- API Route Implementation ---
app.use("/api/login", loginRouter);
app.use("/api", checkToken);
app.use(
  [
    "/api/schoolyear",
    "/api/subject",
    "/api/room",
    "/api/department",
      "/api/college",
      "/api/school",
    "/api/course",
    "/api/semester",
    "/api/teacher",
    "/api/category",
    "/api/item",
    "/api/studentsubject",
    "/api/student",
    "/api/admin",
    "/api/gradschool/item",
  ],
  maintenanceApiStandards,
);
app.use("/api/schoolyear", protectMaintenanceChanges, schoolYearRouter);
app.use("/api/subject", protectMaintenanceChanges, subjectRouter);
app.use("/api/room", protectMaintenanceChanges, roomRouter);
app.use("/api/department", protectMaintenanceChanges, departmentRouter);
app.use("/api/college", protectMaintenanceChanges, collegeRouter);
app.use("/api/school", protectMaintenanceChanges, schoolRouter);
app.use("/api/course", protectMaintenanceChanges, courseRouter);
app.use("/api/semester", protectMaintenanceChanges, semesterRouter);
app.use("/api/teacher", protectMaintenanceChanges, teacherRouter);
app.use("/api/category", protectMaintenanceChanges, categoryRouter);
app.use("/api/item", protectMaintenanceChanges, itemRouter);
app.use(
  "/api/studentsubject",
  requirePermission("maintenance_access"),
  studentSubjectRouter,
);
app.use(
  "/api/student",
  requirePermission("maintenance_access"),
  studentRouter,
);
app.use("/api/admin", requirePermission("maintenance_access"), adminRouter);
app.use("/api/gradschool/item", gradSchoolItemRouter);

app.use("/api/activitylog", requirePermission("users_access"), logRouter);
app.use("/api/permission", requirePermission("users_access"), permissionRouter);
app.use("/api/user", requirePermission("users_access"), userRouter);

app.use("/api/transaction", transactionRouter);
app.use(
  "/api/report/ranking",
  requirePermission("reports_access"),
  rankingRouter,
);
app.use(
  "/api/report/rating",
  requirePermission("reports_access"),
  ratingRouter,
);
app.use(
  "/api/report/log",
  requirePermission("reports_access"),
  reportLogRouter,
);
app.use("/api", apiNotFound);

// --- File Upload Setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const fileName = Date.now() + path.extname(file.originalname);
    cb(null, fileName);
  },
});

const upload = multer({ storage });

app.use("/uploads", express.static("uploads"));

app.post("/upload", checkToken, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: 0, message: "No file uploaded." });
  }

  res.json({
    success: 1,
    imagePath: req.file.path,
    fileName: req.file.filename,
  });
});

// disable registration page
app.use('/register', (req, res) => {
 res.status(404).sendFile(path.join(__dirname, 'client', '404.html'));
});


// --- Serve frontend (HTML/JS/CSS) ---
const clientPath = path.join(__dirname, "client");
const sidebarTemplate = fs.readFileSync(
  path.join(clientPath, "sidebar.html"),
  "utf8",
);

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeSidebarBlock(html, marker) {
  const escapedMarker = escapeRegularExpression(marker);
  return html.replace(
    new RegExp(
      `\\s*<!-- ${escapedMarker}:start -->[\\s\\S]*?<!-- ${escapedMarker}:end -->\\s*`,
      "g",
    ),
    "\n",
  );
}

// Build the sidebar for the authenticated account so inaccessible navigation
// is absent from the HTML response, rather than merely hidden in the browser.
app.get("/sidebar.html", checkToken, (req, res) => {
  let html = sidebarTemplate;
  const accessBlocks = [
    ["access:transaction_access", "transaction_access"],
    ["access:reports_access", "reports_access"],
    ["access:maintenance_access", "maintenance_access"],
    ["access:users_access", "users_access"],
  ];

  accessBlocks.forEach(([marker, field]) => {
    if (Number(req.user?.[field]) !== 1) html = removeSidebarBlock(html, marker);
  });

  const isRater =
    String(req.user?.permission_name || "").trim().toLowerCase() === "rater";
  html = removeSidebarBlock(
    html,
    isRater ? "permission:non-rater" : "permission:rater",
  );
  html = html.replace(
    /<!-- (?:access:[\w-]+|permission:[\w-]+):(start|end) -->\s*/g,
    "",
  );

  return res
    .status(200)
    .type("html")
    .set("Cache-Control", "no-store")
    .send(html);
});

// Do not serve the self-service password page or its assets to Raters.
app.use("/update/password", checkToken, (req, res, next) => {
  if (String(req.user?.permission_name || "").trim().toLowerCase() === "rater")
    return res.redirect(302, "/404.html");
  return next();
});

// Keep directory index files out of the browser address bar.
// For example, /maintenance/student/index.html becomes /maintenance/student/.
app.get(/\/index\.html$/i, (req, res) => {
  const queryStart = req.originalUrl.indexOf("?");
  const queryString =
    queryStart === -1 ? "" : req.originalUrl.slice(queryStart);
  const cleanPath = req.path.replace(/index\.html$/i, "");

  return res.redirect(302, `${cleanPath}${queryString}`);
});

app.use(express.static(clientPath));

// Return the branded error page for every unknown frontend route.
app.get("*", (req, res) => {
  res.status(404).sendFile(path.join(clientPath, "404.html"));
});
app.use(apiErrorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const publicUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  console.log(`SATP server running at ${publicUrl}`);
});
