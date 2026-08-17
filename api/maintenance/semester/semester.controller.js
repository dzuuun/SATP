const model = require("./semester.model");
const { createStandardController } = require("../shared/controller_factory");

const controller = createStandardController(model, {
  entity: "Semester",
  plural: "Semesters",
  actions: {
    getSemesters: ["getSemesters", "list"],
    getActiveSemesters: ["getActiveSemesters", "active"],
    getInUseSemester: ["getInUseSemester", "list"],
    getSemesterById: ["getSemesterById", "one", "id"],
    addSemester: ["addSemester", "create", "body"],
    updateSemester: ["updateSemester", "update", "body"],
    deleteSemester: ["deleteSemester", "delete", "body"],
  },
});

controller.getCurrentSemesterForStudent = (req, res) => {
  model.getCurrentSemesterForStudent(req.user.id, (error, semester) => {
    if (error) return res.status(500).json({ success: 0, message: "Unable to load the current academic term." });
    if (!semester) return res.status(404).json({ success: 0, message: "No current term is configured for your academic group." });
    return res.json({ success: 1, data: semester });
  });
};

controller.getCurrentSemesterForAdmin = (req, res) => {
  model.getCurrentSemesterForAdmin(req.user.id, (error, semester) => {
    if (error)
      return res.status(500).json({
        success: 0,
        message: "Unable to load the administrator's current term.",
      });
    if (!semester)
      return res.status(404).json({
        success: 0,
        message: "No current term is configured for this administrator.",
      });
    return res.json({ success: 1, data: semester });
  });
};

module.exports = controller;
