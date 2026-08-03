const {
  getUsers,
  getUserById,
  updateUser,
  addUser,
  updateUserInfo,
  updateUserControl,
  updateStatus,
  updateUserCredentials,
  deleteUser,
  updatePassword,
  getUserByUserName,
} = require("./user_management.model");
const { genSaltSync, hashSync, compareSync } = require("bcrypt");

module.exports = {
  getUsers: (req, res) => {
    getUsers((err, results) => {
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
        message: "Users information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getUserById: (req, res) => {
    const id = req.params.id;
    getUserById(id, (err, results) => {
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
        message: "User information retrieved successfully.",
        data: results,
      });
    });
  },

  updateUser: (req, res) => {
    const body = { ...req.body };
    if (
      !body.id ||
      !body.username ||
      !body.givenname ||
      !body.surname ||
      !body.gender ||
      !body.permission_id
    ) {
      return res.status(400).json({
        success: 0,
        message: "Complete all required fields.",
      });
    }

    body.password = String(body.password || "").trim();
    if (body.password) {
      body.password = hashSync(body.password, genSaltSync(10));
    } else {
      body.password = null;
    }

    updateUser(body, (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: 0,
          message:
            err.code === "ER_DUP_ENTRY"
              ? "That username is already in use."
              : "Unable to update the user.",
        });
      }
      if (!results.changedRows) {
        return res.json({
          success: 0,
          message: "Contents are still the same.",
        });
      }
      return res.json({
        success: 1,
        message: "User updated successfully.",
      });
    });
  },

  addUser: (req, res) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);
    addUser(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message: "User already exists. Try again.",
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
        message: "User added successfully.",
        data: results,
      });
    });
  },

  updateUserInfo: (req, res) => {
    const body = req.body;
    updateUserInfo(body, (err, results) => {
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
        message: "User information updated successfully.",
      });
    });
  },

  updateUserControl: (req, res) => {
    const body = req.body;
    updateUserControl(body, (err, results) => {
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
        message: "User information updated successfully.",
      });
    });
  },

  updateStatus: (req, res) => {
    const body = req.body;
    updateStatus(body, (err, results) => {
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
        message: "User's status updated successfully.",
      });
    });
  },

  updateUserCredentials: (req, res) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);
    updateUserCredentials(body, (err, results) => {
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
        message: "User's username updated successfully.",
      });
    });
  },

  updatePassword: (req, res) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);
    updatePassword(body, (err, results) => {
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
        message: "User's password updated successfully.",
      });
    });
  },

  getUserByUserName: (req, res) => {
    const body = req.body;
    getUserByUserName(body, (err, results) => {
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
        message: "User retrieved successfully.",
        data: results,
      });
    });
  },
};
