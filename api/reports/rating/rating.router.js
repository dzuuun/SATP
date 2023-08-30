const { getIndividualRating, getComment } = require("./rating.controller");
const router = require("express").Router();

router.post("/individual", getIndividualRating);
router.post("/comment", getComment);

module.exports = router;
