const { getSubjectsByStudent } = require("./studentsubject.controller");
const router = require("express").Router();

router.get("/", getSubjectsByStudent);

module.exports = router;
