const {
  getPermissions,
  getPermissionById,
  addPermission,
  updatePermission,
  deletePermission,
  searchPermissions,
} = require("./permission.model");

module.exports = {
  getPermissions: (req, res) => {
    getPermissions((err, results) => {
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
        message: "Permissions information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getPermissionById: (req, res) => {
    const id = req.params.id;
    getPermissionById(id, (err, results) => {
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
        message: "Permission information retrieved successfully.",
        data: results,
      });
    });
  },

  addPermission: (req, res) => {
    const body = req.body;
    addPermission(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "Permission already exists. Try again.",
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
        message: "Permission added successfully.",
        data: results,
      });
    });
  },

  updatePermission: (req, res) => {
    const body = req.body;
    updatePermission(body, (err, results) => {
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
        message: "Permission information updated successfully.",
      });
    });
  },

  deletePermission: (req, res) => {
    const body = req.body;
    deletePermission(body, (err, results) => {
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
        message: "Permission deleted successfully.",
      });
    });
  },

  searchPermissions: (req, res) => {
    const body = req.body;
    searchPermissions(body, (err, results) => {
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
        message: "Permissions searched successfully.",
        count: results.length,
        data: results,
      });
    });
  },
};
