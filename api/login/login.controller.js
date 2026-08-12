const {
  createUser,
  checkPassword,
  getUsers,
  getUserByUserName,
  logActivity,
  updatePassword,
} = require("./login.model");
const { genSaltSync, hashSync, compareSync } = require("bcrypt");
const {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
} = require("../../auth/auth_validation");

const failedLogins = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function loginKey(req, username) {
  return `${req.ip}:${String(username || "").trim().toLowerCase()}`;
}

function isLoginBlocked(key) {
  const attempt = failedLogins.get(key);
  if (!attempt) return false;
  if (Date.now() - attempt.startedAt >= LOGIN_WINDOW_MS) {
    failedLogins.delete(key);
    return false;
  }
  return attempt.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(key) {
  const current = failedLogins.get(key);
  if (!current || Date.now() - current.startedAt >= LOGIN_WINDOW_MS) {
    failedLogins.set(key, { count: 1, startedAt: Date.now() });
    return;
  }
  current.count += 1;
}

module.exports = {
  createUser: (req, res) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);
    createUser(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message:
            "Username already exists. Try again using a different username.",
        });
      }
      return res.json({
        success: 1,
        message: "Signed up successfully.",
        data: results,
      });
    });
  },

  checkPassword: (req, res) => {
    checkPassword({ id: req.user.id }, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          success: 0,
          message: "Unable to verify the password.",
        });
      }
      if (!results || !compareSync(req.body?.password || "", results.password)) {
        return res.status(401).json({
          success: 0,
          passwordMatched: "false",
          message: "Invalid Password.",
        });
      }
      return res.json({
        success: 1,
        passwordMatched: "true",
        message: "Existing password matched.",
      });
    });
  },

  getUsers: (req, res) => {
    getUsers((err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Users information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  login: (req, res) => {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (
      !username ||
      !password ||
      username.length > 128 ||
      password.length > 256
    ) {
      return res.status(400).json({
        success: 0,
        message: "Username and password are required.",
      });
    }

    const key = loginKey(req, username);
    if (isLoginBlocked(key)) {
      return res.status(429).json({
        success: 0,
        message: "Too many failed attempts. Try again in 15 minutes.",
      });
    }

    getUserByUserName(username, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          success: 0,
          message: "Unable to sign in right now.",
        });
      }
      const validAccount =
        results &&
        Number(results.is_active) === 1 &&
        Number(results.permission_is_active) === 1;
      const passwordMatches =
        validAccount && compareSync(password, results.password);

      if (!passwordMatches) {
        recordFailedLogin(key);
        return res.status(401).json({
          success: 0,
          message: "Invalid username or password.",
        });
      }

      failedLogins.delete(key);
      const token = createSessionToken(results.user_id, results.password);
      setSessionCookie(req, res, token);
      logActivity(results.user_id, "Logged in", (logError) => {
        if (logError) console.error("Unable to log sign in:", logError);
      });
      const { password: _password, permission_is_active: _active, ...user } =
        results;
      return res.json({
        success: 1,
        message: "User logged in successfully.",
        user_id: results.user_id,
        data: user,
      });
    });
  },

  session: (req, res) =>
    res.json({
      success: 1,
      data: req.user,
    }),

  logout: (req, res) => {
    clearSessionCookie(req, res);
    logActivity(req.user.id, "Logged out", (logError) => {
      if (logError) console.error("Unable to log sign out:", logError);
    });
    return res.json({ success: 1, message: "Signed out successfully." });
  },

  updatePassword: (req, res) => {
    const password = String(req.body?.password || "");
    const currentPassword = String(req.body?.current_password || "");
    const passwordAttemptKey = `password:${req.user.id}`;
    if (isLoginBlocked(passwordAttemptKey)) {
      return res.status(429).json({
        success: 0,
        message: "Too many failed attempts. Try again in 15 minutes.",
      });
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: 0,
        message: "The new password must contain 8 to 72 characters.",
      });
    }
    if (!currentPassword || currentPassword.length > 256) {
      return res.status(400).json({
        success: 0,
        message: "Your current password is required.",
      });
    }

    checkPassword({ id: req.user.id }, (verificationError, account) => {
      if (verificationError) {
        console.error(verificationError);
        return res.status(500).json({
          success: 0,
          message: "Unable to verify the current password.",
        });
      }
      if (!account || !compareSync(currentPassword, account.password)) {
        recordFailedLogin(passwordAttemptKey);
        return res.status(400).json({
          success: 0,
          message: "The current password is incorrect.",
        });
      }
      if (compareSync(password, account.password)) {
        return res.status(400).json({
          success: 0,
          message: "Choose a password different from your current password.",
        });
      }

      failedLogins.delete(passwordAttemptKey);
      const body = {
        id: req.user.id,
        user_id: req.user.id,
        password: hashSync(password, genSaltSync(10)),
      };
      updatePassword(body, (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: 0,
            message: "Unable to update the password.",
          });
        }
        if (results.changedRows == 0) {
          return res.json({
            success: 0,
            message: "Contents are still the same.",
          });
        }
        setSessionCookie(req, res, createSessionToken(req.user.id, body.password));
        return res.json({
          success: 1,
          message: "Password updated successfully.",
        });
      });
    });
  },
};
