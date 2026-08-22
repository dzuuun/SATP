const model = require("./school.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "School",
  plural: "Schools",
  actions: {
    getSchools: ["getSchools", "list"],
    getActiveSchools: ["getActiveSchools", "active"],
    getSchoolById: ["getSchoolById", "one", "id"],
    addSchool: ["addSchool", "create", "body"],
    updateSchool: ["updateSchool", "update", "body"],
  },
});
