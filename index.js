require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const {
  checkToken,
  requirePermission,
  protectMaintenanceChanges,
} = require("./auth/auth_validation");

if (!process.env.SECRET_KEY) {
  throw new Error("SECRET_KEY must be configured before starting SATP.");
}

const app = express();
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

// --- Middleware ---
app.use(express.json());
app.use(bodyParser.json());
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

// --- API Route Implementation ---
app.use("/api/login", loginRouter);
app.use("/api", checkToken);
app.use("/api/schoolyear", protectMaintenanceChanges, schoolYearRouter);
app.use("/api/subject", protectMaintenanceChanges, subjectRouter);
app.use("/api/room", protectMaintenanceChanges, roomRouter);
app.use("/api/department", protectMaintenanceChanges, departmentRouter);
app.use("/api/college", protectMaintenanceChanges, collegeRouter);
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
app.use(express.static(clientPath));

// Return the branded error page for every unknown frontend route.
app.get("*", (req, res) => {
  res.status(404).sendFile(path.join(clientPath, "404.html"));
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
