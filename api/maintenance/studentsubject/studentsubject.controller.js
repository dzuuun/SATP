const { getSubjectsByStudent } = require("./studentsubject.model");

module.exports = {
  getSubjectsByStudent: (req, res) => {
    const id = req.params.id;
    getSubjectsByStudent(id, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Student's subjects retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },
};
