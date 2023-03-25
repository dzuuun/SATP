require("dotenv").config();

// express
const express = require("express");
const app = express();
app.use(express.json());
app.use(express.static("client"));

// import routes
const loginRouter = require("./api/login/login.router");
const schoolYearRouter = require("./api/maintenance/schoolyear/schoolyear.router");
const subjectRouter = require("./api/maintenance/subjects/subjects.router");
const roomRouter = require("./api/maintenance/rooms/rooms.router");
const logRouter = require("./api/user/activity_log/log.router");
const departmentRouter = require("./api/maintenance/department/department.router");
const collegeRouter = require("./api/maintenance/college/college.router");
const courseRouter = require("./api/maintenance/course/course.router");

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
app.use("/api/activitylog", logRouter);
app.use("/api/department", departmentRouter);
app.use("/api/college", collegeRouter);
app.use("/api/course", courseRouter);

app.listen(process.env.PORT || "3000", () => {
  console.log(`Server is running on port: ${process.env.PORT || "3000"}`);
});