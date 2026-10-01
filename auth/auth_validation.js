const { sign, verify } = require("jsonwebtoken");
const { createHash, timingSafeEqual } = require("crypto");
const pool = require("../db/db");

const COOKIE_NAME = "satp_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const PRESENCE_UPDATE_INTERVAL_MS = 60 * 1000;
const presenceUpdates = new Map();

function markUserOnline(userId, next) {
  const id = Number(userId);
  const now = Date.now();
  if (!id || now - (presenceUpdates.get(id) || 0) < PRESENCE_UPDATE_INTERVAL_MS)
    return next();

  presenceUpdates.set(id, now);
  pool.query(
    "UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id],
    (error) => {
      if (error) {
        presenceUpdates.delete(id);
        console.error("Unable to update user presence:", error.message);
      }
      return next();
    },
  );
}

function clearUserPresenceThrottle(userId) {
  presenceUpdates.delete(Number(userId));
}

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function getToken(req) {
  const cookieToken = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authorization = req.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : null;
}

function sessionCookieOptions(req) {
  const directHttpAllowed =
    process.env.ALLOW_DIRECT_HTTP === "true" &&
    req &&
    !req.secure &&
    !req.get("x-forwarded-proto");
  const secureCookie =
    !directHttpAllowed &&
    (process.env.COOKIE_SECURE === "true" ||
      (process.env.NODE_ENV === "production" &&
        process.env.COOKIE_SECURE !== "false"));
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: SESSION_DURATION_MS,
    path: "/",
  };
}

function credentialVersion(passwordHash) {
  return createHash("sha256").update(String(passwordHash)).digest("hex");
}

function createSessionToken(userId, passwordHash) {
  return sign(
    {
      sub: String(userId),
      type: "session",
      credential: credentialVersion(passwordHash),
    },
    process.env.SECRET_KEY,
    {
      expiresIn: "8h",
      issuer: "satp",
      audience: "satp-web",
    },
  );
}

function setSessionCookie(req, res, token) {
  res.cookie(COOKIE_NAME, token, sessionCookieOptions(req));
}

function clearSessionCookie(req, res) {
  const options = sessionCookieOptions(req);
  delete options.maxAge;
  res.clearCookie(COOKIE_NAME, options);
}

function checkToken(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({
      success: 0,
      message: "Your session has expired. Please sign in again.",
    });
  }

  verify(
    token,
    process.env.SECRET_KEY,
    { issuer: "satp", audience: "satp-web" },
    (tokenError, decoded) => {
      if (tokenError || decoded?.type !== "session" || !decoded?.sub) {
        clearSessionCookie(req, res);
        return res.status(401).json({
          success: 0,
          message: "Your session is invalid. Please sign in again.",
        });
      }

      pool.query(
        `SELECT
           u.id,
           u.username,
           u.password,
           u.is_temp_pass,
           u.is_student_rater,
           u.is_admin_rater,
           u.admin_academic_scope,
           p.id AS permission_id,
           p.name AS permission_name,
           p.transaction_access,
           p.maintenance_access,
           p.reports_access,
           p.users_access
         FROM users AS u
         INNER JOIN permissions AS p ON p.id = u.permission_id
         WHERE u.id = ?
           AND u.is_active = 1
           AND p.is_active = 1
         LIMIT 1`,
        [decoded.sub],
        (databaseError, users) => {
          if (databaseError) {
            console.error("Unable to validate session:", databaseError);
            return res.status(500).json({
              success: 0,
              message: "Unable to validate your session.",
            });
          }
          if (!users.length) {
            clearSessionCookie(req, res);
            return res.status(401).json({
              success: 0,
              message: "This account is no longer active.",
            });
          }
          const expectedCredential = Buffer.from(
            credentialVersion(users[0].password),
          );
          const receivedCredential = Buffer.from(
            String(decoded.credential || ""),
          );
          if (
            expectedCredential.length !== receivedCredential.length ||
            !timingSafeEqual(expectedCredential, receivedCredential)
          ) {
            clearSessionCookie(req, res);
            return res.status(401).json({
              success: 0,
              message: "Your credentials changed. Please sign in again.",
            });
          }
          const { password: _password, ...authenticatedUser } = users[0];
          req.user = authenticatedUser;
          return markUserOnline(authenticatedUser.id, next);
        },
      );
    },
  );
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (Number(req.user?.[permission]) === 1) return next();
    return res.status(403).json({
      success: 0,
      message: "You do not have permission to perform this action.",
    });
  };
}

function requireSuperAdmin(req, res, next) {
  if (
    String(req.user?.permission_name || "")
      .trim()
      .toLowerCase() === "super admin"
  )
    return next();
  return res.status(403).json({
    success: 0,
    message: "Only Super Admin accounts can use this feature.",
  });
}

// Cookie-authenticated writes must originate from this exact origin. Bearer-only
// API clients do not automatically send credentials and are not CSRF targets.
function requireSameOrigin(req, res, next) {
  if (!parseCookies(req.headers?.cookie || "")[COOKIE_NAME]) return next();
  const origin = req.get("origin");
  const referer = req.get("referer");
  const fetchSite = req.get("sec-fetch-site");
  let expectedOrigin;
  let suppliedOrigin;
  try {
    expectedOrigin = new URL(`${req.protocol}://${req.get("host")}`).origin;
    suppliedOrigin = new URL(origin || referer).origin;
  } catch (_error) {
    suppliedOrigin = null;
  }
  if (
    fetchSite === "cross-site" ||
    !suppliedOrigin ||
    suppliedOrigin !== expectedOrigin
  ) {
    return res.status(403).json({
      success: 0,
      message: "This request must come from the SATP site.",
    });
  }
  return next();
}

function requireNonRater(req, res, next) {
  if (
    String(req.user?.permission_name || "")
      .trim()
      .toLowerCase() !== "rater"
  )
    return next();
  return res.status(403).json({
    success: 0,
    message: "Rater accounts cannot access the password-change page.",
  });
}

function protectMaintenanceChanges(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  return requirePermission("maintenance_access")(req, res, next);
}

module.exports = {
  checkToken,
  requirePermission,
  requireSuperAdmin,
  requireSameOrigin,
  requireNonRater,
  protectMaintenanceChanges,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  clearUserPresenceThrottle,
};
