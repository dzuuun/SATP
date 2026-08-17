const model = require("./schoolyear.model");
const { createStandardController } = require("../shared/controller_factory");

const controller = createStandardController(model, {
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

controller.getCurrentSchoolYear = (req, res) => {
  model.getCurrentSchoolYear((error, schoolYear) => {
    if (error) {
      return res.status(500).json({ success: 0, message: "Unable to load the current school year." });
    }
    if (!schoolYear) {
      return res.status(404).json({ success: 0, message: "No current active school year is configured." });
    }
    return res.json({ success: 1, data: schoolYear });
  });
};

module.exports = controller;
