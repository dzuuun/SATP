const {
  createUser,
  getUserByUserId,
  getUsers,
  login,
} = require("./login.controller");
const router = require("express").Router();

router.post("/register", createUser);
router.get("/:id", getUserByUserId);
router.get("/", getUsers);
router.post("/login", login);

// router.put('/update/password', updateUserPassword);
// router.put('/update', updateUser);
// router.delete('/delete', deleteUser);
module.exports = router;
