const {
  getDepartments,
  getActiveDepartments,
  getDepartmentById,
  getDepartmentByCode,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} = require("./department.model");

module.exports = {
  getDepartments: (req, res) => {
    getDepartments((err, results) => {
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
        message: "Departments information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getActiveDepartments: (req, res) => {
    getActiveDepartments((err, results) => {
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
        message: "Departments information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getDepartmentById: (req, res) => {
    const id = req.params.id;
    getDepartmentById(id, (err, results) => {
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
        message: "Department information retrieved successfully.",
        data: results,
      });
    });
  },

  getDepartmentByCode: (req, res) => {
    const body = req.body;
    getDepartmentByCode(body, (err, results) => {
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
        message: "Department information retrieved successfully.",
        data: results,
      });
    });
  },

  addDepartment: (req, res) => {
    const body = req.body;
    addDepartment(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "Department already exists. Try again.",
        });
      }
      if (results === undefined) {
        return res.status(500).json({
          success: 0,
          message: "Some fields are missing or incorrect format.",
        });
      }
      return res.json({
        success: 1,
        message: "Department added successfully.",
        data: results,
      });
    });
  },

  updateDepartment: (req, res) => {
    const body = req.body;
    updateDepartment(body, (err, results) => {
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
        message: "Department information updated successfully.",
      });
    });
  },

  deleteDepartment: (req, res) => {
    const body = req.body;
    deleteDepartment(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.affectedRows == 0) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Department deleted successfully.",
      });
    });
  },
};
