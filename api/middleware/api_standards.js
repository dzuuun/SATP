const { randomUUID } = require("crypto");

const MAX_NESTING_DEPTH = 12;
const MAX_ARRAY_ITEMS = 10000;
const unsafeKeys = new Set(["__proto__", "prototype", "constructor"]);

function apiRequestContext(req, res, next) {
  const incoming = req.get("x-request-id");
  req.requestId =
    incoming && /^[a-zA-Z0-9._-]{8,100}$/.test(incoming)
      ? incoming
      : randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

function inspectPayload(value, depth = 0) {
  if (depth > MAX_NESTING_DEPTH) {
    const error = new Error("Request payload is nested too deeply.");
    error.statusCode = 400;
    throw error;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) {
      const error = new Error(
        `A request may contain at most ${MAX_ARRAY_ITEMS} items.`,
      );
      error.statusCode = 413;
      throw error;
    }
    value.forEach((item) => inspectPayload(item, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.keys(value).forEach((key) => {
    if (unsafeKeys.has(key)) {
      const error = new Error("Request payload contains an unsafe field.");
      error.statusCode = 400;
      throw error;
    }
    inspectPayload(value[key], depth + 1);
  });
}

function validateNumericParams(req) {
  for (const [key, value] of Object.entries(req.params || {})) {
    if (!/(^id$|_id$)/i.test(key)) continue;
    if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
      const error = new Error(`Invalid ${key.replaceAll("_", " ")}.`);
      error.statusCode = 400;
      throw error;
    }
  }
}

function maintenanceApiStandards(req, res, next) {
  try {
    const hasBody = Number(req.get("content-length") || 0) > 0;
    if (
      ["POST", "PUT", "PATCH"].includes(req.method) ||
      (req.method === "DELETE" && hasBody)
    ) {
      if (!req.is("application/json")) {
        const error = new Error("Content-Type must be application/json.");
        error.statusCode = 415;
        throw error;
      }
      inspectPayload(req.body);
    }
    validateNumericParams(req);

    const requestedLimit = Number(req.query?.limit);
    const requestedOffset = Number(req.query?.offset);
    req.pagination = {
      limit: Number.isInteger(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 500)
        : null,
      offset:
        Number.isInteger(requestedOffset) && requestedOffset >= 0
          ? requestedOffset
          : 0,
    };

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Accept-Encoding");
    return next();
  } catch (error) {
    return next(error);
  }
}

function apiNotFound(req, res) {
  return res.status(404).json({
    success: 0,
    message: "API endpoint not found.",
    request_id: req.requestId,
  });
}

function apiErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const malformedJson = error instanceof SyntaxError && "body" in error;
  const status = malformedJson
    ? 400
    : error.statusCode || error.status || (error.code === "LIMIT_FILE_SIZE" ? 413 : 500);
  if (status >= 500) {
    console.error(`[${req.requestId || "no-request-id"}]`, error);
  }
  return res.status(status).json({
    success: 0,
    message:
      status >= 500
        ? "An unexpected server error occurred."
        : malformedJson
          ? "Request body contains invalid JSON."
          : error.message,
    request_id: req.requestId,
  });
}

module.exports = {
  apiRequestContext,
  maintenanceApiStandards,
  apiNotFound,
  apiErrorHandler,
};
