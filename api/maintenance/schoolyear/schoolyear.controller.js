const model = require("./schoolyear.model");
const { createStandardController } = require("../shared/controller_factory");

module.exports = createStandardController(model, {
  entity: "School year",
  plural: "School years",
  actions: {
    getSchoolYears: ["getSchoolYears", "list"],
    getActiveSchoolYears: ["getActiveSchoolYears", "active"],
    getInUseSchoolYear: ["getInUseSchoolYear", "list"],
    getSchoolYearById: ["getSchoolYearById", "one", "id"],
    getSchoolYearByName: ["getSchoolYearByName", "one", "body"],
    addSchoolYear: ["addSchoolYear", "create", "body"],
    updateSchoolYear: ["updateSchoolYear", "update", "body"],
    deleteSchoolYear: ["deleteSchoolYear", "delete", "body"],
  },
});
