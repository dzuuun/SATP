// const {
//   createUser,
//   getUserByUserId,
//   getUsers,
//   login,
// } = require("./login.controller");
const router = require("express").Router();
const { checkToken } = require("../../auth/auth_validation");

const login = require("./login.controller")

router.post("/register", login.createUser);
router.get("/:id", login.getUserByUserId);
router.get("/", login.getUsers);
router.post("/login", login.login);

// router.put('/update/password', updateUserPassword);
// router.put('/update', updateUser);
// router.delete('/delete', deleteUser);
module.exports = router;
