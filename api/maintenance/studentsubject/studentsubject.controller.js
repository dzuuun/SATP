const {
  getIncludedSubjectsByStudent,
  getExcludedSubjectsByStudent,
  getExcludedSubjects,
  addStudentSubject,
  updateStudentSubject,
  // deleteStudentSubject,
  searchStudentSubject,
} = require("./studentsubject.model");

module.exports = {
  getIncludedSubjectsByStudent: (req, res) => {
    const body = req.body;
    getIncludedSubjectsByStudent(body, (err, results) => {
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

  getExcludedSubjectsByStudent: (req, res) => {
    const body = req.body;
    getExcludedSubjectsByStudent(body, (err, results) => {
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
        message: "Student's subjects that are excluded retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getExcludedSubjects: (req, res) => {
    getExcludedSubjects((err, results) => {
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
        message: "Deleted student's subjects retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  addStudentSubject: (req, res) => {
    const body = req.body;
    addStudentSubject(body, (err, results) => {
      if (err) {
        console.log(err);
        return res.json({
          success: 0,
          message: "Student's subject already exists. Try again.",
        });
      }
      if (results === undefined) {
        return res.json({
          success: 0,
          message: "Some fields are missing or incorrect format.",
        });
      }
      return res.json({
        success: 1,
        message: "Student's subject added successfully.",
        data: results,
      });
    });
  },

  updateStudentSubject: (req, res) => {
    const body = req.body;
    updateStudentSubject(body, (err, results) => {
      if (err) {
        console.log(err);
        return false;
      }
      if (results.changedRows == 0) {
        return res.json({
          success: 0,
          message: "Contents are still the same.",
        });
      }
      return res.json({
        success: 1,
        message: "Student's subject information updated successfully.",
      });
    });
  },

  // deleteStudentSubject: (req, res) => {
  //   const body = req.body;
  //   deleteStudentSubject(body, (err, results) => {
  //     console.log(results)
  //     if (err) {
  //       console.log(err);
  //       return false;
  //     }
  //     if (results.changedRows == 0) {
  //       return res.json({
  //         success: 0,
  //         message: "No action done.",
  //       });
  //     }
  //     return res.json({
  //       success: 1,
  //       message: "Student's subject information deleted successfully.",
  //     });
  //   });
  // },

  searchStudentSubject: (req, res) => {
    const body = req.body;
    searchStudentSubject(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.length === 0) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Rooms searched successfully.",
        count: results.length,
        data: results,
      });
    });
  },
};
