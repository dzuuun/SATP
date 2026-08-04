const model = require("./college.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "College",
  plural: "Colleges",
  actions: {
    getColleges: ["getColleges", "list"],
    getActiveColleges: ["getActiveColleges", "active"],
    getCollegeById: ["getCollegeById", "one", "id"],
    getCollegeByCode: ["getCollegeByCode", "one", "body"],
    addCollege: ["addCollege", "create", "body"],
    updateCollege: ["updateCollege", "update", "body"],
    deleteCollege: ["deleteCollege", "delete", "body"],
  },
});
