const {
  getUsers,
  getUserById,
  updateUser,
  addUser,
  updateUserInfo,
  updateUserControl,
  updateStatus,
  updateUserCredentials,
  updatePassword,
  getUserByUserName,
  bulkDeactivateUsers,
} = require("./user_management.controller");
const router = require("express").Router();

router.post("/add", addUser);
router.get("/:id", getUserById);
router.get("/", getUsers);
router.put("/update", updateUser);
router.put("/update/info", updateUserInfo);
router.put("/update/control", updateUserControl);
router.put("/update/status", updateStatus);
router.put("/update/credentials", updateUserCredentials);
router.put("/update/password", updatePassword);
router.post("/get", getUserByUserName);
router.put("/bulk/deactivate", bulkDeactivateUsers);
module.exports = router;
