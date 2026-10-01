"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  requirePermission,
  requireSuperAdmin,
  requireSameOrigin,
  protectMaintenanceChanges,
} = require("../auth/auth_validation");

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

test("Super Admin-only features allow only the Super Admin role", () => {
  for (const permissionName of ["Super Admin", " super admin "]) {
    const res = responseDouble();
    let called = false;
    requireSuperAdmin(
      { user: { permission_name: permissionName } },
      res,
      () => {
        called = true;
      },
    );
    assert.equal(called, true);
    assert.equal(res.statusCode, 200);
  }

  for (const permissionName of ["Admin", "System Administrator", "Rater"]) {
    const res = responseDouble();
    requireSuperAdmin(
      { user: { permission_name: permissionName } },
      res,
      () => {
        throw new Error("next must not be called");
      },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, 0);
  }
});

function originRequest(headers = {}) {
  const requestHeaders = { cookie: "satp_session=session-token", ...headers };
  return {
    protocol: "https",
    headers: requestHeaders,
    get(name) {
      return requestHeaders[name.toLowerCase()];
    },
  };
}

test("cookie-authenticated destructive requests require the exact SATP origin", () => {
  const allowed = originRequest({
    host: "satp.example.edu",
    origin: "https://satp.example.edu",
  });
  const allowedResponse = responseDouble();
  let called = false;
  requireSameOrigin(allowed, allowedResponse, () => {
    called = true;
  });
  assert.equal(called, true);

  for (const headers of [
    { host: "satp.example.edu" },
    {
      host: "satp.example.edu",
      origin: "https://satp.example.edu.attacker.test",
    },
    { host: "satp.example.edu", origin: "http://satp.example.edu" },
    { host: "satp.example.edu", origin: "null" },
    {
      host: "satp.example.edu",
      origin: "https://satp.example.edu",
      "sec-fetch-site": "cross-site",
    },
  ]) {
    const res = responseDouble();
    requireSameOrigin(originRequest(headers), res, () => {
      throw new Error("A cross-origin request must not proceed");
    });
    assert.equal(res.statusCode, 403);
  }
});

test("same-origin Referer is accepted and bearer-only API clients are unaffected", () => {
  const refererResponse = responseDouble();
  let refererAccepted = false;
  requireSameOrigin(
    originRequest({
      host: "satp.example.edu",
      referer: "https://satp.example.edu/maintenance/student/",
    }),
    refererResponse,
    () => {
      refererAccepted = true;
    },
  );
  assert.equal(refererAccepted, true);

  const bearerResponse = responseDouble();
  let bearerAccepted = false;
  requireSameOrigin(
    originRequest({ cookie: "", host: "satp.example.edu" }),
    bearerResponse,
    () => {
      bearerAccepted = true;
    },
  );
  assert.equal(bearerAccepted, true);
});

test("bulk deactivation and MSSQL execution use the same-origin guard", () => {
  const userRouter = require("../api/user/user_management/user_management.router");
  const mssqlRouter = require("../api/maintenance/mssql_import/mssql_import.router");
  for (const [router, path] of [
    [userRouter, "/bulk/deactivate"],
    [mssqlRouter, "/run"],
  ]) {
    const route = router.stack.find(
      (layer) => layer.route?.path === path,
    )?.route;
    assert.ok(route, `${path} route must exist`);
    assert.equal(route.stack[0].handle, requireSameOrigin);
  }
});

test("bulk password updates and deactivation require Super Admin", () => {
  const userRouter = require("../api/user/user_management/user_management.router");
  for (const path of ["/update/password", "/bulk/deactivate"]) {
    const route = userRouter.stack.find(
      (layer) => layer.route?.path === path,
    )?.route;
    assert.ok(route, `${path} route must exist`);
    assert.equal(route.stack[0].handle, requireSameOrigin);
    assert.equal(route.stack[1].handle, requireSuperAdmin);
  }
});
