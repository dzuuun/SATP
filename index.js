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

var bodyParser = require("body-parser");
app.use(bodyParser.json());

var cors = require("cors");
app.use(cors());

var morgan = require("morgan");
app.use(morgan("combined"));

// routes implementation
app.use("/api/user", loginRouter);
app.use("/api/schoolyear", schoolYearRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/activity_log", logRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/college", collegeRouter);

app.listen(process.env.PORT || "3000", () => {
  console.log(`Server is running on port: ${process.env.PORT || "3000"}`);
});
