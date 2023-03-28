require("dotenv").config();

// express
const express = require("express");
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

// user
const logRouter = require("./api/user/activity_log/log.router");
const permissionRouter = require("./api/user/permission/permission.router");
const userRouter = require("./api/user/user_management/user_management.router");

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

app.use("/api/activitylog", logRouter);
app.use("/api/permission", permissionRouter);
app.use("/api/user", userRouter);

app.listen(process.env.PORT || "3000", () => {
  console.log(`Server is running on port: ${process.env.PORT || "3000"}`);
});
