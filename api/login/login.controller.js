const {
  createUser,
  checkPassword,
  getUsers,
  getUserByUserName,
  updatePassword
} = require("./login.model");
const { genSaltSync, hashSync, compareSync } = require("bcrypt");

module.exports = {
  createUser: (req, res) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);
    createUser(body, (err, results) => {
      if (err) {
        return res.json({
          success: 0,
          message:
            "Username already exists. Try again using a different username.",
        });
      }
      return res.json({
        success: 1,
        message: "User added successfully.",
        data: results,
      });
    });
  },

  checkPassword: (req, res) => {
    const body = req.body;
    checkPassword(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      const result = compareSync(body.password, results.password);
      if (result === false) {
        return res.json({
          success: 0,
          passwordMatched: "false",
          message: "Invalid Password.",
        });
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        passwordMatched: "true",
        message: "Existing password matched.",
      });
    });
  },

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

  login: (req, res) => {
    const body = req.body;
    getUserByUserName(body.username, (err, results) => {
      if (err) {
        console.log(err);
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "Invalid username or password.",
        });
      }
      const result = compareSync(body.password, results.password);
      if (result) {
        // results.password = undefined;
        // const jsontoken = sign({ result: results }, process.env.SECRET_KEY, {
        //   expiresIn: "4h",
        // });
        return res.json({
          success: 1,
          message: "User logged in successfully.",
          user_id: results.user_id,
          data: results,
          // token: jsontoken,
        });
      } else {
        return res.status(500).json({
          success: 0,
          message: "Invalid username or password.",
        });
      }
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
        message: "Password updated successfully.",
      });
    });
  },
};
