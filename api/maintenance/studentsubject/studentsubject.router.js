const { getSubjectsByStudent } = require("./studentsubject.controller");
const router = require("express").Router();

router.get("/student/:id", getSubjectsByStudent);

module.exports = router;
