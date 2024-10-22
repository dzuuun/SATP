require("dotenv").config();

// express
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
app.use(express.json());
app.use(express.static("client"));


// import routes
const loginRouter = require("./api/login/login.router");
// maintenance
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

// user
const logRouter = require("./api/user/activity_log/log.router");
const permissionRouter = require("./api/user/permission/permission.router");
const userRouter = require("./api/user/user_management/user_management.router");

// transaction
const transactionRouter = require("./api/transaction/studentRatingStatus/srs.router");

// report
const rankingRouter = require("./api/reports/ranking/ranking.router");
const ratingRouter = require("./api/reports/rating/rating.router");

var bodyParser = require("body-parser");
app.use(bodyParser.json());

var cors = require("cors");
app.use(cors());

var morgan = require("morgan");
app.use(morgan("combined"));

// routes implementation
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

app.use("/api/activitylog", logRouter);
app.use("/api/permission", permissionRouter);
app.use("/api/user", userRouter);

app.use("/api/transaction", transactionRouter);

app.use("/api/report/ranking", rankingRouter);
app.use("/api/report/rating", ratingRouter);

// image upload
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

app.use(express.static(__dirname));
app.use("/uploads", express.static("uploads"));

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const responseObj = {
    imagePath: req.file.path,
    fileName: req.file.filename,
  };

  const imagePath = req.file.path;
    res.json(responseObj);
});

app.listen(process.env.PORT || "4000", () => {
  console.log(`Server is running on port: ${process.env.PORT || "4000"}`);
});
