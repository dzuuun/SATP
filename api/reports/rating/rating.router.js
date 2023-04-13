const { getIndividualRating } = require("./rating.controller");
const router = require("express").Router();

router.get("/individual", getIndividualRating);

module.exports = router;
