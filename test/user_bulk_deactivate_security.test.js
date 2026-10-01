"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("bulk deactivation uses the authenticated actor, not a request-supplied ID", () => {
  const modelPath =
    require.resolve("../api/user/user_management/user_management.model");
  const controllerPath =
    require.resolve("../api/user/user_management/user_management.controller");
  const previousModel = require.cache[modelPath];
  const previousController = require.cache[controllerPath];
  let received;
  try {
    require.cache[modelPath] = {
      id: modelPath,
      filename: modelPath,
      loaded: true,
      exports: {
        bulkDeactivateUsers(data, callback) {
          received = data;
          callback(null, { deactivated: 1 });
        },
      },
    };
    delete require.cache[controllerPath];
    const controller = require(controllerPath);
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
    controller.bulkDeactivateUsers(
      { user: { id: 42 }, body: { user_id: 999, usernames: ["student-1"] } },
      response,
    );
    assert.equal(received.user_id, 42);
    assert.deepEqual(received.usernames, ["student-1"]);
    assert.equal(response.body.success, 1);
  } finally {
    if (previousModel) require.cache[modelPath] = previousModel;
    else delete require.cache[modelPath];
    if (previousController) require.cache[controllerPath] = previousController;
    else delete require.cache[controllerPath];
  }
});
