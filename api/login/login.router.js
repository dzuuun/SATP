const {
  login,
  updatePassword,
  session,
  logout,
  googleConfig,
  googleLogin,
} = require("./login.controller");
const router = require("express").Router();
const { checkToken } = require("../../auth/auth_validation");

router.post("/", login);
router.get("/google/config", googleConfig);
router.post("/google", googleLogin);
router.get("/session", checkToken, session);
router.post("/logout", checkToken, logout);
router.put("/update/password", checkToken, updatePassword);
router.all("/register", (_req, res) =>
  res.status(404).json({ success: 0, message: "Registration is disabled." }),
);

module.exports = router;
