const {
  getUsers,
  getUserById,
  addUser,
  updateUserInfo,
  updateUserControl,
  updateUserPassword,
  updateUserUsername,
  deleteUser,
  searchUsers,
} = require("./user_management.model");
const { genSaltSync, hashSync, compareSync } = require('bcrypt');

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
          message: "Record not found.",
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
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "User information retrieved successfully.",
        data: results,
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

  updateUserPassword: (req, res) => {
    const body = req.body;
        const salt = genSaltSync(10);
        body.password = hashSync(body.password, salt);
    updateUserPassword(body, (err, results) => {
      console.log(results)
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

  updateUserUsername: (req, res) => {
    const body = req.body;
    updateUserUsername(body, (err, results) => {
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

  deleteUser: (req, res) => {
    const data = req.body;
    deleteUser(data, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.affectedRows == 0) {
        return res.json({
          success: 0,
          message: "Record not found.",
        });
      }
      return res.json({
        success: 1,
        message: "User deleted successfully.",
      });
    });
  },

  searchUsers: (req, res) => {
    const body = req.body;
    searchUsers(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.length === 0) {
        return res.json({
          success: 0,
          message: "No entry found.",
        });
      }
      return res.json({
        success: 1,
        message: "Users searched successfully.",
        count: results.length,
        data: results,
      });
    });
  },
};
