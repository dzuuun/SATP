const {
  getUsers,
  getUserById,
  addUser,
  updateUserInfo,
  updateUserControl,
  updateUserPassword,
  updateUserUsername,
  deleteUser,
  searchUsers,
} = require("./user_management.controller");
const router = require("express").Router();

router.post("/add", addUser);
router.get("/:id", getUserById);
router.get("/", getUsers);
router.put("/update/info", updateUserInfo);
router.put("/update/control", updateUserControl);
router.put("/update/password", updateUserPassword);
router.put("/update/username", updateUserUsername);
router.get("/search/any", searchUsers);
router.delete("/delete", deleteUser);

module.exports = router;
