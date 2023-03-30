const { login } = require("./login.controller");
const router = require("express").Router();
const { checkToken } = require("../../auth/auth_validation");

// router.post("/register", login.createUser);
// router.get("/:id", login.getUserByUserId);
// router.get("/", login.getUsers);
router.post("/", checkToken, login);

module.exports = router;
