"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../api/maintenance/studentsubject/studentsubject.model");
const controller = require("../api/maintenance/studentsubject/studentsubject.controller");

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

function validRequest(overrides = {}) {
  return {
    user: { id: 99 },
    body: {
      school_year_id: 1,
      semester_id: 2,
      subject_id: 3,
      current_teacher_id: 4,
      teacher_id: 5,
      teaching_school_id: 6,
      schedule_code: "AH 112-COMM1",
      ...overrides,
    },
  };
}

test("reassignment rejects an invalid teacher before calling the model", () => {
  const original = model.reassignScheduleTeacher;
  let called = false;
  model.reassignScheduleTeacher = () => {
    called = true;
  };
  try {
    const res = responseDouble();
    controller.reassignScheduleTeacher(validRequest({ teacher_id: "" }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, 0);
    assert.equal(called, false);
  } finally {
    model.reassignScheduleTeacher = original;
  }
});

test("reassignment passes the authenticated user to the model", () => {
  const original = model.reassignScheduleTeacher;
  let received;
  model.reassignScheduleTeacher = (data, callback) => {
    received = data;
    callback(null, { enrollments_updated: 12, transactions_updated: 8 });
  };
  try {
    const res = responseDouble();
    controller.reassignScheduleTeacher(validRequest(), res);
    assert.equal(received.user_id, 99);
    assert.equal(received.schedule_code, "AH 112-COMM1");
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, {
      enrollments_updated: 12,
      transactions_updated: 8,
    });
  } finally {
    model.reassignScheduleTeacher = original;
  }
});

test("reassignment returns a model failure without exposing a success", () => {
  const original = model.reassignScheduleTeacher;
  model.reassignScheduleTeacher = (_data, callback) =>
    callback(new Error("No matching section assignments were found."));
  try {
    const res = responseDouble();
    controller.reassignScheduleTeacher(validRequest(), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, 0);
    assert.match(res.body.message, /No matching section/);
  } finally {
    model.reassignScheduleTeacher = original;
  }
});

test("active assignment list returns records from the model", () => {
  const original = model.getActiveScheduleAssignments;
  model.getActiveScheduleAssignments = (_data, callback) =>
    callback(null, [{ schedule_code: "AH 112-COMM1", teacher_name: "Dr. Test, PhD" }]);
  try {
    const res = responseDouble();
    controller.getActiveScheduleAssignments(
      { query: { school_year_id: 1, semester_id: 2 }, user: { id: 7 } },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].schedule_code, "AH 112-COMM1");
  } finally {
    model.getActiveScheduleAssignments = original;
  }
});

test("schedule transfer rejects an invalid target before calling the model", () => {
  const original = model.transferScheduleDepartment;
  let called = false;
  model.transferScheduleDepartment = () => {
    called = true;
  };
  try {
    const res = responseDouble();
    controller.transferScheduleDepartment(
      validRequest({
        current_department_id: 7,
        target_department_id: "",
      }),
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, 0);
    assert.equal(called, false);
  } finally {
    model.transferScheduleDepartment = original;
  }
});

test("schedule transfer passes the authenticated user and assignment to the model", () => {
  const original = model.transferScheduleDepartment;
  let received;
  model.transferScheduleDepartment = (data, callback) => {
    received = data;
    callback(null, {
      enrollments_updated: 6,
      school: "Senior High School",
      department: "SHS",
    });
  };
  try {
    const res = responseDouble();
    controller.transferScheduleDepartment(
      validRequest({
        current_department_id: 7,
        target_department_id: 8,
      }),
      res,
    );
    assert.equal(received.user_id, 99);
    assert.equal(received.current_teacher_id, 4);
    assert.equal(received.current_department_id, 7);
    assert.equal(received.target_department_id, 8);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.enrollments_updated, 6);
  } finally {
    model.transferScheduleDepartment = original;
  }
});
