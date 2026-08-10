"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { requirePermission, protectMaintenanceChanges } = require("../auth/auth_validation");

function responseDouble() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("requirePermission allows a permitted user", () => {
  const req = { user: { maintenance_access: 1 } };
  const res = responseDouble();
  let called = false;
  requirePermission("maintenance_access")(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test("requirePermission rejects a user without permission", () => {
  const req = { user: { maintenance_access: 0 } };
  const res = responseDouble();
  requirePermission("maintenance_access")(req, res, () => {
    throw new Error("next must not be called");
  });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, 0);
});

test("maintenance GET requests remain readable", () => {
  const req = { method: "GET", user: { maintenance_access: 0 } };
  const res = responseDouble();
  let called = false;
  protectMaintenanceChanges(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
});

test("maintenance write requests require permission", () => {
  const req = { method: "PUT", user: { maintenance_access: 0 } };
  const res = responseDouble();
  protectMaintenanceChanges(req, res, () => {
    throw new Error("next must not be called");
  });
  assert.equal(res.statusCode, 403);
});
