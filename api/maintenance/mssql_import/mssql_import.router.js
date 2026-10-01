const router = require("express").Router();
const controller = require("./mssql_import.controller");
const { requireSameOrigin } = require("../../../auth/auth_validation");

router.post("/preview", controller.preview);
router.post("/run", requireSameOrigin, controller.run);
router.get("/student-courses", controller.studentCourses);

module.exports = router;
