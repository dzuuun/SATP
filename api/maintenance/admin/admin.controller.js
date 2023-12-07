const { genSaltSync,  hashSync, compareSync } = require("bcrypt");
const {
  getAllAdmin,
  getAllActiveAdmin,
  getAdminById,
  addAdmin,
  updateAdminInfo,
  updateAdminActiveStatus,
  deleteAdmin,
} = require("./admin.model");

module.exports = {
  getAllAdmin: (req, res) => {
    getAllAdmin((err, results) => {
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
        message: "List of admins retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getAllActiveAdmin: (req, res) => {
    getAllActiveAdmin((err, results) => {
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
        message: "List of admins retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getAdminById: (req, res) => {
    const id = req.params.id;
    getAdminById(id, (err, results) => {
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
        message: "Admin retrieved successfully.",
        data: results,
      });
    });
  },

  addAdmin: (req, res) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);
    addAdmin(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "Admin already exists. Try again.",
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
        message: "Admin added successfully.",
      });
    });
  },

  updateAdminInfo: (req, res) => {
    const body = req.body;
    updateAdminInfo(body, (err, results) => {
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
        message: "Admin's Information updated successfully.",
      });
    });
  },

  updateAdminActiveStatus: (req, res) => {
    const body = req.body;
    updateAdminActiveStatus(body, (err, results) => {
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
        message: "Student's status updated successfully.",
      });
    });
  },

  deleteAdmin: (req, res) => {
    const body = req.body;
    deleteAdmin(body, (err, results) => {
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
        message: "Admin deleted successfully.",
      });
    });
  },
};
