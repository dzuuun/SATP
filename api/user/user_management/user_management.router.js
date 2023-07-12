const {
  getUsers,
  getUserById,
  addUser,
  updateUserInfo,
  updateUserControl,
  updateStatus,
  updateUserCredentials,
} = require("./user_management.controller");
const router = require("express").Router();

router.post("/add", addUser);
router.get("/:id", getUserById);
router.get("/", getUsers);
router.put("/update/info", updateUserInfo);
router.put("/update/control", updateUserControl);
router.put("/update/status", updateStatus);
router.put("/update/credentials", updateUserCredentials);

module.exports = router;
