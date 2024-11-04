const {
  getUsers,
  getUserById,
  addUser,
  updateUserInfo,
  updateUserControl,
  updateStatus,
  updateUserCredentials,
  updatePassword,
  getUserByUserName
} = require("./user_management.controller");
const router = require("express").Router();

router.post("/add", addUser);
router.get("/:id", getUserById);
router.get("/", getUsers);
router.put("/update/info", updateUserInfo);
router.put("/update/control", updateUserControl);
router.put("/update/status", updateStatus);
router.put("/update/credentials", updateUserCredentials);
router.put("/update/password", updatePassword);
router.post("/get", getUserByUserName);
module.exports = router;
