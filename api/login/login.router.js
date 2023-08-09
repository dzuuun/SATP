const { login, checkPassword, updatePassword } = require("./login.controller");
const router = require("express").Router();
const { checkToken } = require("../../auth/auth_validation");

// router.post("/register", login.createUser);
// router.get("/:id", login);
router.post("/", login);
router.post("/user", checkPassword);
router.put("/update/password", updatePassword);
// router.post("/", checkToken, login);

module.exports = router;
