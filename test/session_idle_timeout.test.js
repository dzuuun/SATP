"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const jwt = require("jsonwebtoken");

const HOUR = 60 * 60;
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

function serverSession() {
  let now = 1_800_000_000;
  const account = { id: 42, username: "test-user", password: "test-password-hash" };
  let active = true;
  const module = { exports: {} };
  const clockJwt = {
    sign: (payload, secret, options) => jwt.sign({ ...payload, iat: now }, secret, options),
    verify: (token, secret, options, done) => jwt.verify(token, secret, { ...options, clockTimestamp: now }, done),
  };
  const pool = {
    query(sql, _params, done) {
      done(null, sql.trim().startsWith("SELECT") ? (active ? [account] : []) : { changedRows: 1 });
    },
  };
  vm.runInNewContext(read("auth/auth_validation.js"), {
    module, Buffer, URL, console,
    process: { env: { SECRET_KEY: "idle-timeout-test-secret", NODE_ENV: "production" } },
    Date: class extends Date { static now() { return now * 1000; } },
    require: (name) => name === "jsonwebtoken" ? clockJwt : name === "../db/db" ? pool : require(name),
  });
  const auth = module.exports;
  function validate(handler, token) {
    return new Promise((resolve) => {
      const headers = { cookie: `satp_session=${token}`, host: "satp.example.edu", origin: "https://satp.example.edu" };
      const req = { secure: true, protocol: "https", headers, get: (name) => headers[name.toLowerCase()] };
      const res = {
        statusCode: 200, cookies: [], headers: {},
        cookie(name, value, options) { this.cookies.push({ name, value, options }); },
        clearCookie() {},
        setHeader(name, value) { this.headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; resolve({ req, res, allowed: false }); return this; },
      };
      handler(req, res, () => resolve({ req, res, allowed: true }));
    });
  }
  return { auth, account, validate, advance: (seconds) => { now += seconds; }, deactivate: () => { active = false; } };
}

test("user activity renews both the token and cookie beyond the original eight-hour sign-in limit", async () => {
  const session = serverSession();
  const original = session.auth.createSessionToken(42, session.account.password);
  session.advance(7 * HOUR);
  const renewed = await session.validate(session.auth.renewSession, original);
  assert.equal(renewed.allowed, true);
  const cookie = renewed.res.cookies[0];
  assert.equal(cookie.name, "satp_session");
  assert.equal(cookie.options.maxAge, 8 * HOUR * 1000);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, "lax");
  assert.equal(cookie.options.secure, true);
  assert.equal(renewed.res.headers["Cache-Control"], "no-store");
  assert.equal("password" in renewed.req.user, false);
  assert.equal(jwt.decode(cookie.value).exp - jwt.decode(original).exp, 7 * HOUR);
  session.advance(2 * HOUR);
  assert.equal((await session.validate(session.auth.checkToken, cookie.value)).allowed, true);
  session.advance(6 * HOUR);
  const expired = await session.validate(session.auth.renewSession, cookie.value);
  assert.equal(expired.res.statusCode, 401);
  assert.equal(expired.res.cookies.length, 0);
});

test("background session checks do not extend the inactivity deadline", async () => {
  const session = serverSession();
  const token = session.auth.createSessionToken(42, session.account.password);
  for (let hour = 1; hour < 8; hour++) {
    session.advance(HOUR);
    const checked = await session.validate(session.auth.checkToken, token);
    assert.equal(checked.allowed, true);
    assert.equal(checked.res.cookies.length, 0);
  }
  session.advance(HOUR);
  assert.equal((await session.validate(session.auth.checkToken, token)).res.statusCode, 401);
});

test("renewal still rejects changed credentials, disabled accounts and invalid tokens", async () => {
  const session = serverSession();
  const token = session.auth.createSessionToken(42, session.account.password);
  session.account.password = "changed-password-hash";
  const changed = await session.validate(session.auth.renewSession, token);
  assert.equal(changed.res.statusCode, 401);
  assert.equal(changed.res.cookies.length, 0);
  const replacement = session.auth.createSessionToken(42, session.account.password);
  session.deactivate();
  assert.equal((await session.validate(session.auth.renewSession, replacement)).res.statusCode, 401);
  assert.equal((await session.validate(session.auth.renewSession, "invalid-token")).res.statusCode, 401);
});

test("the renewal endpoint uses the same-origin guard before authenticated renewal", () => {
  const routes = [];
  const router = {};
  for (const method of ["get", "post", "put", "all"]) router[method] = (path, ...handlers) => routes.push({ method, path, handlers });
  const session = serverSession();
  const module = { exports: {} };
  vm.runInNewContext(read("api/login/login.router.js"), {
    module,
    require: (name) => name === "express" ? { Router: () => router } : name.includes("auth_validation") ? session.auth : {},
  });
  const route = routes.find((route) => route.method === "post" && route.path === "/activity");
  assert.equal(route.handlers[0], session.auth.requireSameOrigin);
  assert.equal(route.handlers[1], session.auth.renewSession);
  const headers = { cookie: "satp_session=token", host: "satp.example.edu", origin: "https://other.example.edu" };
  let rejected = false;
  session.auth.requireSameOrigin({ protocol: "https", headers, get: (name) => headers[name] }, {
    status(code) { assert.equal(code, 403); return this; },
    json() { rejected = true; },
  }, () => assert.fail("Cross-origin renewal must be rejected"));
  assert.equal(rejected, true);
});

function clientActivity({ visible = true, signedIn = true } = {}) {
  let now = 1_000_000;
  let fail = false;
  const requests = [];
  const events = {};
  const timers = [];
  const document = {
    visibilityState: visible ? "visible" : "hidden",
    addEventListener(name, handler) { events[name] = handler; },
  };
  const window = {
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (fail) throw new Error("offline");
      return { ok: true };
    },
    setInterval(callback, interval) { timers.push({ callback, interval }); return timers.length; },
    clearInterval() {}, addEventListener() {},
  };
  const context = vm.createContext({
    window, document,
    localStorage: { getItem: () => signedIn ? "42" : null },
    Date: class extends Date { static now() { return now; } },
  });
  const source = read("client/auth-session.js");
  vm.runInContext("let promptVisible = false;\n" + source.slice(source.indexOf("  const ACTIVITY_REFRESH_INTERVAL_MS"), source.indexOf("  const originalOpen")), context);
  return {
    requests, events, timers, document, context,
    advance: (ms) => { now += ms; },
    offline: (value) => { fail = value; },
    settle: () => new Promise((resolve) => setImmediate(resolve)),
    renewals: () => requests.filter((request) => request.url === "/api/login/activity"),
  };
}

test("trusted interaction renews sessions with a throttle; synthetic events and polling do not", async () => {
  const page = clientActivity();
  await page.settle();
  assert.equal(page.renewals().length, 1);
  page.events.pointermove({ isTrusted: true });
  assert.equal(page.renewals().length, 1);
  page.advance(61_000);
  page.events.input({ isTrusted: false });
  assert.equal(page.renewals().length, 1);
  page.events.keydown({ isTrusted: true });
  await page.settle();
  assert.equal(page.renewals().length, 2);
  assert.equal(page.renewals()[1].options.method, "POST");
  for (let hour = 0; hour < 8; hour++) {
    page.advance(HOUR * 1000);
    page.timers[0].callback();
    await page.settle();
  }
  assert.equal(page.renewals().length, 2);
  assert.equal(page.requests.filter((request) => request.url === "/api/login/session").length, 8);
});

test("hidden or signed-out pages do not renew and returning to the visible tab counts as activity", async () => {
  const page = clientActivity({ visible: false });
  await page.settle();
  page.events.pointerdown({ isTrusted: true });
  assert.equal(page.renewals().length, 0);
  page.document.visibilityState = "visible";
  page.events.visibilitychange({ isTrusted: true });
  await page.settle();
  assert.equal(page.renewals().length, 1);
  const signedOut = clientActivity({ signedIn: false });
  signedOut.events.keydown({ isTrusted: true });
  assert.equal(signedOut.renewals().length, 0);
});

test("failed renewals remain throttled and an expired-session prompt stops further renewal", async () => {
  const page = clientActivity();
  await page.settle();
  page.advance(61_000);
  page.offline(true);
  page.events.scroll({ isTrusted: true });
  await page.settle();
  for (let i = 0; i < 10; i++) page.events.pointermove({ isTrusted: true });
  assert.equal(page.renewals().length, 2);
  page.offline(false);
  page.advance(61_000);
  page.events.pointerdown({ isTrusted: true });
  await page.settle();
  assert.equal(page.renewals().length, 3);
  vm.runInContext("promptVisible = true", page.context);
  page.advance(61_000);
  page.events.keydown({ isTrusted: true });
  assert.equal(page.renewals().length, 3);
});
