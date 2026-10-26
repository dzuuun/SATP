"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { compareSync } = require("bcrypt");

const read = (name) =>
  fs.readFileSync(path.join(__dirname, "..", name), "utf8");
function load(name, mocks) {
  const module = { exports: {} };
  vm.runInNewContext(read(name), {
    module,
    require: (name) => mocks[name] || require(name),
    console,
  });
  return module.exports;
}

function update(body) {
  const queries = [];
  const connection = {
    beginTransaction: (done) => done(),
    commit: (done) => done(),
    rollback: (done) => done(),
    release() {},
    query(sql, params, done) {
      queries.push({ sql, params: Array.from(params) });
      done(null, { changedRows: sql.startsWith("UPDATE users") ? 1 : 0 });
    },
  };
  const model = load("api/user/user_management/user_management.model.js", {
    "../../../db/db": { getConnection: (done) => done(null, connection) },
  });
  const controller = load(
    "api/user/user_management/user_management.controller.js",
    {
      "./user_management.model": model,
    },
  );
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  controller.updateUser(
    {
      user: { id: 42 },
      body: {
        id: 9,
        username: "test-user",
        givenname: "Test",
        surname: "User",
        gender: "MALE",
        permission_id: 1,
        is_student_rater: 0,
        is_admin_rater: 1,
        is_temp_pass: 1,
        is_active: 1,
        user_id: 999,
        ...body,
      },
    },
    response,
  );
  return { queries, response };
}

test("explicit password clearing stores NULL, resets temporary status, and records the authenticated actor", () => {
  for (const student of [0, 1]) {
    const { queries, response } = update({
      clear_password: true,
      is_student_rater: student,
    });
    assert.equal(response.body.success, 1);
    const userUpdate = queries.find(({ sql }) =>
      sql.startsWith("UPDATE users"),
    );
    assert.match(userUpdate.sql, /password=NULL/);
    assert.equal(userUpdate.params[3], 0);
    assert.equal(userUpdate.params.length, 9);
    assert.equal(userUpdate.params.at(-1), 9);
    const log = queries.find(({ sql }) =>
      sql.startsWith("INSERT INTO activity_log"),
    );
    assert.equal(log.params[0], 42);
    assert.match(log.params[1], /cleared password/);
  }
});

test("blank edits and false clear flags preserve the saved password", () => {
  for (const clear of [undefined, false, "false", 0, "0"]) {
    const { queries, response } = update({
      password: "",
      clear_password: clear,
    });
    assert.equal(response.body.success, 1);
    const userUpdate = queries.find(({ sql }) =>
      sql.startsWith("UPDATE users"),
    );
    assert.doesNotMatch(userUpdate.sql, /password=/);
    assert.equal(userUpdate.params[3], 1);
    assert.equal(userUpdate.params.length, 9);
  }
});

test("new passwords still hash correctly and conflicting clear requests make no changes", () => {
  const normal = update({ password: "NewPassword123" });
  const userUpdate = normal.queries.find(({ sql }) =>
    sql.startsWith("UPDATE users"),
  );
  assert.match(userUpdate.sql, /password=\?/);
  assert.equal(compareSync("NewPassword123", userUpdate.params[8]), true);
  assert.equal(userUpdate.params[3], 1);
  const conflict = update({ password: "NewPassword123", clear_password: true });
  assert.equal(conflict.response.statusCode, 400);
  assert.equal(conflict.queries.length, 0);
});

test("edit form clears explicitly, disables conflicting input, and resets when opening another account", async () => {
  const source = read("client/user/user_management/script.js");
  const fields = new Map();
  const field = (id) => {
    if (!fields.has(id))
      fields.set(id, {
        value: "",
        checked: false,
        disabled: false,
        classList: { toggle() {} },
        listeners: {},
        addEventListener(name, fn) {
          this.listeners[name] = fn;
        },
      });
    return fields.get(id);
  };
  let row = {
    id: 1,
    username: "test-user",
    has_password: 1,
    is_student_rater: 0,
    is_temp_pass: 1,
  };
  let saved;
  const context = vm.createContext({
    state: {},
    document: { getElementById: field },
    requestJson: async () => ({ success: 1, data: row }),
    setValue: (id, value) => {
      field(id).value = value;
    },
    configurePermissionSelect() {},
    toggleModal() {},
    showToast: (message) => {
      throw new Error(message);
    },
    FormData: class extends Map {
      constructor(form) {
        super(Object.entries(form));
        if (field("editPassword").disabled) this.delete("password");
      }
    },
    save: async (_url, _method, payload) => {
      saved = payload;
    },
  });
  vm.runInContext(
    source.slice(
      source.indexOf("async function editUser("),
      source.indexOf("async function save("),
    ),
    context,
  );
  await context.editUser(1);
  field("editPassword").value = "unsaved password";
  field("editClearPassword").checked = true;
  field("editClearPassword").listeners.change({
    target: field("editClearPassword"),
  });
  assert.equal(field("editPassword").disabled, true);
  assert.equal(field("editPassword").value, "");
  assert.equal(field("editTemporaryPassword").checked, false);
  await field("editUserForm").listeners.submit({
    preventDefault() {},
    currentTarget: { role: "admin", password: "" },
  });
  assert.equal(saved.clear_password, true);
  assert.equal(saved.is_temp_pass, 0);
  assert.equal("password" in saved, false);
  row = { ...row, id: 2, has_password: 0 };
  await context.editUser(2);
  assert.equal(field("editClearPassword").checked, false);
  assert.equal(field("editClearPassword").disabled, true);
  assert.equal(field("editPassword").disabled, false);
});
