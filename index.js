require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
app.use(morgan("combined"));

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
app.use("/api/schoolyear", schoolYearRouter);
app.use("/api/subject", subjectRouter);
app.use("/api/room", roomRouter);
app.use("/api/department", departmentRouter);
app.use("/api/college", collegeRouter);
app.use("/api/course", courseRouter);
app.use("/api/semester", semesterRouter);
app.use("/api/teacher", teacherRouter);
app.use("/api/category", categoryRouter);
app.use("/api/item", itemRouter);
app.use("/api/studentsubject", studentSubjectRouter);
app.use("/api/student", studentRouter);
app.use("/api/admin", adminRouter);
app.use("/api/gradschool/item", gradSchoolItemRouter);

app.use("/api/activitylog", logRouter);
app.use("/api/permission", permissionRouter);
app.use("/api/user", userRouter);

app.use("/api/transaction", transactionRouter);
app.use("/api/report/ranking", rankingRouter);
app.use("/api/report/rating", ratingRouter);

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

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: 0, message: "No file uploaded." });
  }

  res.json({
    success: 1,
    imagePath: req.file.path,
    fileName: req.file.filename,
  });
});

// --- Serve frontend (HTML/JS/CSS) ---
const clientPath = path.join(__dirname, "client");
app.use(express.static(clientPath));

// Optional: fallback for SPA routing (if needed)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// --- Start Server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
