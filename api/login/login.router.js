const { login, checkPassword, updatePassword, createUser } = require("./login.controller");
const router = require("express").Router();
const { checkToken } = require("../../auth/auth_validation");

router.post("/register", createUser);
// router.get("/:id", login);
router.post("/", login);
router.post("/user", checkPassword);
router.put("/update/password", updatePassword);
// router.post("/", checkToken, login);

module.exports = router;
